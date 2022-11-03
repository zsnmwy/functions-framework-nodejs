/* eslint-disable @typescript-eslint/no-unused-vars */
import * as Debug from 'debug';
import {get, invoke, isEmpty, omit, transform, trim} from 'lodash';

import {OpenFunctionRuntime} from './runtime';

const debug = Debug('ofn:plugin');

/**
 * Defining an abstract class to represent Plugin.
 * @public
 **/
export class Plugin {
  /**
   * Name of the plugin.
   */
  readonly name: string;

  /**
   * Version of the plugin.
   */
  readonly version: string;

  /**
   * Constructor of the OpenFunction plugin.
   */
  constructor(name: string, version = 'unknown') {
    if (!trim(name)) {
      throw new Error('Plugin name must be specified.');
    }

    this.name = name;
    this.version = version;
  }

  /**
   * Get the value of a property on the plugin.
   * @param prop - The property to get.
   * @returns The value of the property.
   */
  get(prop: string) {
    return get(this, prop);
  }

  /**
   * This function is called before the user function is executed.
   * @param ctx - Object that contains information about the function that is being executed.
   * @param plugins - The collection of loaded pre and post hook plugins.
   */
  async execPreHook(
    ctx: OpenFunctionRuntime | null,
    plugins: Record<string, Plugin>
  ) {
    console.warn(
      `Plugin "${this.name}" has not implemented pre hook function.`
    );
  }

  /**
   * This function is called after the user function is executed.
   * @param ctx - Object that contains information about the function that is being executed.
   * @param plugins - The collection of loaded pre and post hook plugins.
   */
  async execPostHook(
    ctx: OpenFunctionRuntime | null,
    plugins: Record<string, Plugin>
  ) {
    console.warn(
      `Plugin "${this.name}" has not implemented post hook function.`
    );
  }
}

/**
 * PluginMap type definition.
 */
export type PluginMap = Record<string, Plugin> & {_seq?: string[]};

enum PluginStoreType {
  BUILTIN = 1,
  CUSTOM,
}

/**
 * Initializes a store object for PluginStore singleton class
 * with the keys of the PluginStoreType enum and the values of an empty object.
 **/
const stores = transform(
  PluginStoreType,
  (r, k, v) => {
    r[v] = {_seq: []} as {} as PluginMap;
  },
  <Record<string, PluginMap>>{}
);

/**
 * PluginStore is a class that manages a collection of plugins.
 **/
export class PluginStore {
  /**
   * Type of the plugin store.
   */
  static Type = PluginStoreType;

  /**
   * Singleton helper method to create PluginStore instance.
   * @param type - PluginStoreType - The type of plugin store you want to create.
   * @returns A new instance of the PluginStore class.
   */
  static Instance(type = PluginStore.Type.CUSTOM): PluginStore {
    return new PluginStore(type);
  }

  /**
   * Internal store type.
   */
  #type = PluginStoreType.CUSTOM;

  /**
   * Internal store object.
   */
  readonly #store: PluginMap | null = null;

  /**
   * Private constructor of PluginStore.
   * @param type - PluginStoreType - The type of store you want to use.
   */
  private constructor(type: PluginStoreType) {
    if (!this.#store) {
      this.#type = type;
      this.#store = stores[type];
    }
  }

  /**
   * Adds a plugin to the store.
   * @param plugin - Plugin - The plugin to register.
   */
  register(plugin: Plugin) {
    this.#store![plugin.name] = plugin;
    this.#store!._seq?.push(plugin.name);
  }

  /**
   * Removes a plugin from the store.
   * @param plugin - Plugin - The plugin to register.
   */
  unregister(plugin: Plugin) {
    delete this.#store![plugin.name];
    omit(this.#store!._seq, plugin.name);
  }

  /**
   * Return the plugin with the given name from the store.
   * @param name - The name of the plugin.
   * @returns The plugin object.
   */
  get(name: string): Plugin {
    return this.#store![name];
  }

  /**
   * Getter that tells whether the store is custom type.
   * @returns `true` if the `#type` is `PluginStoreType.CUSTOM`.
   */
  get #isCustomStore(): boolean {
    return this.#type === PluginStoreType.CUSTOM;
  }

  /**
   * It invokes the `execPreHook` function of each plugin in the order specified by the `seq` array
   * @param ctx - The context object that is passed to the plugin.
   * @param [seq] - The sequence of plugins to be executed. If not specified, all plugins will be executed.
   */
  async execPreHooks(ctx: OpenFunctionRuntime | null, seq?: string[]) {
    await this.#invokePluginBySeq(
      ctx,
      'execPreHook',
      seq || (this.#isCustomStore && get(ctx, 'prePlugins')) || []
    );
  }

  /**
   * It invokes the `execPostHook` function of each plugin in the order specified by the `seq` array
   * @param ctx - The context object that is passed to the plugin.
   * @param [seq] - The sequence of plugins to be executed. If not specified, all plugins will be executed.
   */
  async execPostHooks(ctx: OpenFunctionRuntime | null, seq?: string[]) {
    await this.#invokePluginBySeq(
      ctx,
      'execPostHook',
      seq || (this.#isCustomStore && get(ctx, 'postPlugins')) || []
    );
  }

  /**
   * It invokes a method on each plugin in the sequence.
   * @param ctx - OpenFunctionRuntime context object.
   * @param method - The method to invoke on the plugin.
   * @param [seq] - The sequence of plugins to invoke. If not provided, the default sequence will be used.
   */
  async #invokePluginBySeq(
    ctx: OpenFunctionRuntime | null,
    method: keyof Plugin,
    seq: string[]
  ) {
    const pluginNames = !isEmpty(seq) ? seq : this.#store!._seq ?? [];
    const plugins = this.#store!;

    for (const pluginName of pluginNames) {
      const plugin = plugins[pluginName];
      debug('Executing "%s" of plugin "%s"', method, pluginName);

      // Try to invoke the plugin method and catch exceptions
      try {
        await invoke(plugin, method, ctx, plugins);
      } catch (ex) {
        const err = <Error>ex;
        console.error(
          `Failed to invoke "${method}" of plugin "${pluginName}"` +
            `\nDetailed stack trace: ${err.stack}`
        );
      }
    }
  }
}
