import {env} from 'process';

import {chain, get, has, extend} from 'lodash';
import {Request, Response} from 'express';
import {DaprClient, CommunicationProtocolEnum} from 'dapr-client';

import {
  OpenFunctionComponent,
  OpenFunctionContext,
  ContextUtils,
} from './function_context';

/**
 * Defining the interface of the HttpTarget.
 * @public
 */
export interface HttpTrigger {
  req?: Request;
  res?: Response;
}

/**
 * Defining the type union of OpenFunction trigger.
 * @public
 */
export type OpenFunctionTrigger = HttpTrigger;

/**
 * The OpenFunction's serving runtime abstract class.
 * @public
 */
export abstract class OpenFunctionRuntime {
  /**
   * The context of the OpenFunction.
   */
  protected readonly context: OpenFunctionContext;

  /**
   * The optional trigger of OpenFunction.
   */
  protected trigger?: OpenFunctionTrigger;

  /**
   * Constructor of the OpenFunctionRuntime.
   */
  constructor(context: OpenFunctionContext) {
    this.context = context;
  }

  /**
   * Static method to parse the context and get runtime.
   */
  static Parse(context: OpenFunctionContext): OpenFunctionRuntime {
    return new DaprRuntime(context);
  }

  /**
   * It creates a proxy for the runtime object, which delegates all property access to the runtime object
   * @param context - The context object to be proxied.
   * @returns The proxy object.
   */
  static ProxyContext(context: OpenFunctionContext): OpenFunctionRuntime {
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

  /**
   * Getter for the port of Dapr sidecar
   */
  get sidecarPort() {
    return {
      HTTP: env.DAPR_HTTP_PORT || '3500',
      GRRC: env.DAPR_GRPC_PORT || '50001',
    };
  }

  /**
   * Getter returns the request object from the trigger.
   * @returns The request object.
   */
  get req() {
    return this.trigger?.req;
  }

  /**
   * Getter returns the response object from the trigger.
   * @returns The res property of the trigger object.
   */
  get res() {
    return this.trigger?.res;
  }

  /**
   * It sets the trigger object to the request and response objects passed in
   * @param req - The HTTP request object
   * @param res - The HTTP response object
   */
  setTrigger(req: Request, res?: Response) {
    this.trigger = extend(this.trigger, {req, res});
  }

  /**
   * The promise that send data to certain ouput.
   */
  abstract send(data: object, output?: string): Promise<object>;
}

/**
 * Dapr runtime class derived from OpenFunctionRuntime.
 */
class DaprRuntime extends OpenFunctionRuntime {
  /**
   * The Dapr client instance.
   */
  private daprClient!: DaprClient;

  /**
   * Constructor of the DaprRuntime.
   */
  constructor(context: OpenFunctionContext) {
    super(context);

    /**
     * NOTE: GRPC is not well supported so far in Dapr Node.js SDK
     * TODO: Should determine whether to use GRPC channel
     */
    this.daprClient = new DaprClient(
      undefined,
      this.sidecarPort.HTTP,
      CommunicationProtocolEnum.HTTP
    );
  }

  /**
   * Send data to the Dapr runtime (sidecar).
   * @param {object} data - The data to send to the output.
   * @param {string} [output] - The output to send the data to.
   * @returns The promise of the actions being executed.
   */
  send(data: object, output?: string): Promise<object> {
    const actions = chain(this.context.outputs)
      .filter((v, k) => !output || k === output)
      .map((component: OpenFunctionComponent) => {
        if (ContextUtils.IsBindingComponent(component)) {
          return this.daprClient.binding.send(
            component.componentName,
            component.operation || '',
            data,
            component.metadata
          );
        } else if (ContextUtils.IsPubSubComponent(component)) {
          return this.daprClient.pubsub.publish(
            component.componentName,
            component.uri || '',
            data
          );
        }

        return Promise.resolve(undefined);
      })
      .value();

    return Promise.allSettled(actions);
  }
}
