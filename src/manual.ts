import { DaprServer } from "@dapr/dapr";
import { createHttpTerminator } from "http-terminator";
import { HandlerFunction, OpenFunction } from "./functions";
import { ErrorHandler } from "./invoker";
import { getUserFunction, getBuiltinPlugins, getFunctionPlugins } from "./loader";
import { handleShutdown } from "./main";
import { parseOptions, helpText, OptionsError } from "./options";
import { getServer } from "./server";
import { Express } from 'express';
import getAsyncServer from './openfunction/async_server';
import * as http from 'http';
import { SignatureType } from "./types";

export const checkFunctionReady = async () => {
    const options = parseOptions();

    if (options.printHelp) {
        console.error(helpText);
        return;
    }

    const loadedFunction = await getUserFunction(
        options.sourceLocation,
        options.target,
        options.signatureType
    );

    if (!loadedFunction) {
        console.error('Could not load the function, shutting down.');
        // eslint-disable-next-line no-process-exit
        process.exit(1);
    }

    return loadedFunction;
}

let isLoad = false
export const loadPlugins = async () => {
    if (isLoad) return;
    const options = parseOptions();

    // Load function plugins before starting server
    // First, we load system built-in function plugins
    await getBuiltinPlugins(options.context!);
    // Then, we load user-defined function plugins
    await getFunctionPlugins(options.sourceLocation);

    isLoad = true
}

export const createAsyncServer = async () => {
    try {
        const options = parseOptions();
        const f = await checkFunctionReady();

        options.context!.port = options.port;

        if (!f) {
            console.error("Fail to load user Function")
            process.exit(1)
        }

        const server = getAsyncServer(
            f.userFunction! as OpenFunction,
            options.context!
        );

        return server;

    } catch (e) {
        if (e instanceof OptionsError) {
            console.error(e.message);
            // eslint-disable-next-line no-process-exit
            if (!e.message.match('Fail to load plugins')) {
                process.exit(1);
            }
        }
        throw e;
    }

}

export const startAsyncServer = async (server: DaprServer) => {
    try {
        await server.start();
        // DaprServer uses httpTerminator in server.stop()
        handleShutdown(async () => await server.stop());
    } catch (e) {
        if (e instanceof OptionsError) {
            console.error(e.message);
            // eslint-disable-next-line no-process-exit
            if (!e.message.match('Fail to load plugins')) {
                process.exit(1);
            }
        }
        throw e;
    }
}

export const createSyncServer = async (preExpressMiddlewareFn: (app: unknown) => Promise<void>, postExpressMiddlewareFn: (app: unknown) => Promise<void>, isLoadUserFunction: boolean) => {
    try {
        const options = parseOptions();
        let f: {
            userFunction: HandlerFunction
            signatureType: SignatureType
        } = {
            userFunction: () => ({}),
            signatureType: 'http'
        };
        if (isLoadUserFunction) {
            // @ts-ignore
            f = await checkFunctionReady();
            if (!f) {
                console.error("Fail to load user Function")
                process.exit(1)
            }
        }
        await loadPlugins();
        const app = await getServer(f!.userFunction!, f!.signatureType, isLoadUserFunction, options.context, preExpressMiddlewareFn, postExpressMiddlewareFn);
        return app;
    } catch (e) {
        if (e instanceof OptionsError) {
            console.error(e.message);
            // eslint-disable-next-line no-process-exit
            if (!e.message.match('Fail to load plugins')) {
                process.exit(1);
            }
        }
        throw e;
    }
}

export const startSyncServer = async (app: Express, isLoadUserFunction: boolean) => {
    try {
        const options = parseOptions();

        let f: {
            userFunction: HandlerFunction
            signatureType: SignatureType
        } = {
            userFunction: () => ({}),
            signatureType: 'http'
        };
        if (isLoadUserFunction) {
            // @ts-ignore
            f = await checkFunctionReady();
            if (!f) {
                console.error("Fail to load user Function")
                process.exit(1)
            }
        }
        await loadPlugins();
        const server = http.createServer(app)
        const errorHandler = new ErrorHandler(server);
        server
            .listen(options.port, () => {
                errorHandler.register();
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Serving function...');
                    console.log(`Function: ${options.target}`);
                    console.log(`Signature type: ${f.signatureType}`);
                    console.log(`URL: http://localhost:${options.port}/`);
                }
            })
            .setTimeout(0); // Disable automatic timeout on incoming connections.

        // Create and use httpTerminator for Express
        const terminator = createHttpTerminator({
            server,
        });
        handleShutdown(async () => await terminator.terminate());
    } catch (e) {
        if (e instanceof OptionsError) {
            console.error(e.message);
            // eslint-disable-next-line no-process-exit
            if (!e.message.match('Fail to load plugins')) {
                process.exit(1);
            }
        }
        throw e;
    }
}