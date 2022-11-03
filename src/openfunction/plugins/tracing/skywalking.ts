import * as Debug from 'debug';
import {forEach, get} from 'lodash';

import agent, {ContextManager} from 'skywalking-backend-js';
import Tag from 'skywalking-backend-js/lib/Tag';
import {Component} from 'skywalking-backend-js/lib/trace/Component';
import {ContextCarrier} from 'skywalking-backend-js/lib/trace/context/ContextCarrier';
import {SpanLayer} from 'skywalking-backend-js/lib/proto/language-agent/Tracing_pb';

import {OpenFunctionRuntime} from '../../runtime';

import Tracing from '.';

const debug = Debug('ofn:plugin:tracing');

/**
 * SkyWalking specific implementation of tracer plugin.
 * See also: https://github.com/apache/skywalking-data-collect-protocol/blob/master/language-agent/Tracing.proto
 */
export default class SkyWalking extends Tracing {
  /**
   * It starts the SkyWalking tracer agent.
   */
  protected async startAgent() {
    // AgentConfig: https://github.com/apache/skywalking-nodejs/blob/master/src/config/AgentConfig.ts
    agent.start({
      serviceName: this.config.tags?.func,
      collectorAddress: this.config.provider?.oapServer || '127.0.0.1:11800',
      // FIXME: NO span could be recorded with "http" plugin enabled
      // FIXME: "express" plugin will block error span record
      disablePlugins: 'http,express',
    });
  }

  /**
   * It creates a new entry span, sets the span layer to FAAS, and sets the span tags.
   * @param ctx - OpenFunctionRuntime - The context object that is passed to the function.
   */
  protected async startSpan(ctx: OpenFunctionRuntime) {
    const context = ContextManager.current;
    const span =
      ContextManager.currentSpan ??
      context.newEntrySpan('/', this.#getCarrier(ctx));

    span.operation = get(ctx, 'name')!;
    span.component = this.#component;
    span.layer = SpanLayer.FAAS;

    // Pass through some typical tags per the context
    span.tag({
      key: 'runtime',
      val: get(ctx, 'runtime')!,
      overridable: false,
    });

    if (ctx.req) {
      span.tag(Tag.httpMethod(ctx.req?.method));
      span.tag(Tag.httpURL(ctx.req?.originalUrl));
    }

    // Pass through user defined "tags" data
    forEach(this.config.tags, (val, key) => {
      span.tag({
        key,
        val,
        overridable: false,
      });
    });

    // Start the span once all set
    // span.async();
    span.start();

    // FIXME: SkyWalking Node.js SDK has not implemented "sw-correlation" injection,
    // so we cannot deal with "baggage" data passed through tracer plugin options

    // Save back trace id for potential future use
    ctx.locals.traceId = context.traceId();
    debug('Span trace id: %s', ctx.locals.traceId);
  }

  /**
   * It stops the current span, and if there was an error, it marks the span as an error.
   * @param ctx - OpenFunctionRuntime - The context object that is passed to the function.
   */
  protected async stopSpan(ctx: OpenFunctionRuntime) {
    const span = ContextManager.currentSpan;

    ctx.error && span.error(ctx.error);
    span.stop();

    // NOTE: `flush` may take some time
    await agent.flush();
  }

  /**
   * Private getter for OpenFunction tracer component.
   * See also: https://github.com/apache/skywalking/blob/master/oap-server/server-starter/src/main/resources/component-libraries.yml#L548
   */
  get #component(): Component {
    return new Component(5013);
  }

  /**
   * If the request has headers, return a ContextCarrier from those headers.
   * See also: https://skyapm.github.io/document-cn-translation-of-skywalking/zh/8.0.0/protocols/Skywalking-Cross-Process-Propagation-Headers-Protocol-v3.html
   *
   * @param ctx - OpenFunctionRuntime - The context object that is passed to the function.
   * @returns The ContextCarrier is being returned.
   */
  #getCarrier(ctx: OpenFunctionRuntime): ContextCarrier | undefined {
    return ContextCarrier.from(ctx.req?.headers as Record<string, string>);
  }
}
