import {forEach, has, get} from 'lodash';
import {DaprServer} from 'dapr-client';

import {OpenFunction} from '../functions';

import {OpenFunctionContext, ContextUtils} from './function_context';
import {OpenFunctionRuntime} from './function_runtime';

export type AsyncFunctionServer = DaprServer;

/**
 * Creates and configures an Dapr server and returns an HTTP server
 * which will run it.
 * @param userFunction User's function.
 * @param functionSignatureType Type of user's function signature.
 * @return HTTP server.
 */
export default function (
  userFunction: OpenFunction,
  context: OpenFunctionContext
): AsyncFunctionServer {
  const app = new DaprServer('localhost', context.port);
  const ctx = getContextProxy(context);

  const wrapper = async (data: object) => {
    await userFunction(ctx, data);
  };

  // Initialize the server with the user's function.
  // For server interfaces, refer to https://github.com/dapr/js-sdk/blob/master/src/interfaces/Server/

  // For each input in context, bind the user function according to the component type.
  forEach(context.inputs, component => {
    if (ContextUtils.IsBindingComponent(component)) {
      app.binding.receive(component.componentName, wrapper);
    } else if (ContextUtils.IsPubSubComponent(component)) {
      app.pubsub.subscribe(
        component.componentName,
        component.uri || '',
        wrapper
      );
    }
  });

  return app;
}

/**
 * It creates a proxy for the runtime object, which delegates all property access to the runtime object
 * @param {OpenFunctionContext} context - The context object to be proxied.
 * @returns The proxy object.
 */
function getContextProxy(context: OpenFunctionContext): OpenFunctionRuntime {
  // Get a proper runtime for the context
  const runtime = OpenFunctionRuntime.Parse(context);

  // Create a proxy for the context
  return new Proxy(runtime, {
    get: (target, prop) => {
      // Provide delegated property access of the context object
      if (has(target.context, prop)) return get(target.context, prop);
      // Otherwise, return the property of the runtime object
      else return Reflect.get(target, prop);
    },
  });
}
