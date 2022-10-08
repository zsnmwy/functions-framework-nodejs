import {TraceConfig, TraceProviderType} from '../../context';
import {Plugin} from '../../plugin';

export default abstract class Tracing extends Plugin {
  /**
   * Property to hold the trace configurations.
   */
  protected readonly config: TraceConfig;

  /**
   * The constructor function is called when a new instance of the class is created
   * @param config - TraceConfig - Configuration object that you can use to configure the agent.
   */
  constructor(config: TraceConfig) {
    super('tracing', 'v1');

    this.config = config;
    this.startAgent();
  }

  /**
   * If the config is enabled, return a new instance of the supported tracing plugin.
   * @param [config] - TraceConfig - The configuration of the plugin.
   * @returns A Plugin object or null.
   */
  static Create(config?: TraceConfig): Plugin | null {
    if (!config?.enabled) return null;

    // So far, we only support SkyWalking
    if (config?.provider?.name === TraceProviderType.SkyWalking)
      return new SkyWalking(config);

    return null;
  }

  /**
   * Getter returns whether thie plugin is enabled.
   * @returns A boolean value of the enabled property of the config object.
   */
  get enabled(): boolean {
    return !!this.config.enabled;
  }

  /**
   * Pre hook starts a tracing span.
   * @param ctx - The context object that is passed to the hook.
   */
  async execPreHook(ctx: unknown) {
    await this.startSpan(ctx);
  }

  /**
   * Post hook ends a tracing span.
   * @param ctx - The context object that is passed to the hook.
   */
  async execPostHook(ctx: unknown) {
    await this.stopSpan(ctx);
  }

  /**
   * Abstract method to start the tracer agent.
   */
  protected abstract startAgent(): void;
  /**
   * Abstract method to start the context span.
   * @param ctx OpenFunction runtime context.
   */
  protected abstract startSpan(ctx: unknown): Promise<void>;
  /**
   * Abstract method to stop the context span.
   * @param ctx OpenFunction runtime context.
   */
  protected abstract stopSpan(ctx: unknown): Promise<void>;
}

// HACK: Break circular reference
import SkyWalking from './skywalking';
