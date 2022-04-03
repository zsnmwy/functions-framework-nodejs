import {env} from 'process';

import {chain} from 'lodash';
import {DaprClient, CommunicationProtocolEnum} from 'dapr-client';

import {
  OpenFunctionComponent,
  OpenFunctionContext,
  ContextUtils,
} from './function_context';

/**
 * The OpenFunction's serving runtime abstract class.
 */
export abstract class OpenFunctionRuntime {
  /**
   * The context of the OpenFunction.
   */
  readonly context: OpenFunctionContext;

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
   * Getter for the port of Dapr sidecar
   */
  get sidecarPort() {
    return {
      HTTP: env.DAPR_HTTP_PORT || '3500',
      GRRC: env.DAPR_GRPC_PORT || '50001',
    };
  }

  /**
   * The promise that send data to certain ouput binding or pubsub topic.
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
