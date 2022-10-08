# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/@openfunction/functions-framework?activeTab=versions

## 0.6.0 / 2022-10-08

We are pleased to bring up two amazing features in this release: a plugin system and a built-in SkyWalking tracing plugin.

The plugin system was introduced along with OpenFunction Framework 0.6.0 (see this [proposal](https://github.com/OpenFunction/OpenFunction/blob/main/docs/proposals/202112-functions-framework-refactoring.md) for reference) and supported by Go Functions Framework starting from 0.3.0. Node.js Functions Framework similarly supports the plugin mechanism and provides an easier way to bootstrap the plugin.

- Node.js Plugin Sample: To be drafted
  - Plugins for testing: <https://github.com/OpenFunction/functions-framework-nodejs/tree/master/test/data/plugins>
- Go Plugin Sample: <https://github.com/OpenFunction/samples/tree/main/functions/knative/with-output-binding>

OpenFunction Framework 0.6.0 also [proposed](https://github.com/OpenFunction/OpenFunction/blob/main/docs/proposals/202112-support-function-tracing.md) tracing capacity to make function calls observable. By leveraging the plugin system, we implemented the SkyWalking plugin within the functions framework to provide samples for both tracing and plugin systems.

- Tutorial: [How to enable the SkyWalking plugin in OpenFunction](https://openfunction.dev/docs/best-practices/skywalking-solution-for-openfunction/)
- SkyWalking Plugin: <https://github.com/OpenFunction/functions-framework-nodejs/blob/master/src/openfunction/plugins/tracing/skywalking.ts>

Lastly, we also enabled gracefully shutdown of function on `SIGINT` & `SIGTERM` signals, which helps to avoid losing the request or event when the function rolls out or scales down.

## 0.5.0 / 2022-05-27

We are having a standalone `openfunction` signature type starting from this release!

Now you can use `function (ctx, data)` as the function signature along with `openfunction` signature type, this allows you to use sync functions in a far more flexible way - whenever there are functions output requirements, sync functions can also send output to Dapr output binding or pubsub components.

Check the demo of the HTTP request triggering the async function:

- Quickstart: <https://openfunction-talks.netlify.app/2022/203-node-mixed/>
- Sample: <https://github.com/OpenFunction/samples/tree/main/functions/knative/with-output-binding-node>

## 0.4.1 / 2022-04-17

This feature release officially introduces the support of OpenFunction async function runtime, now your Node.js functions can enjoy the power of Dapr runtime starting from bindings and pubsub. Functions Framework will call [Dapr Node.js SDK](https://github.com/dapr/js-sdk) to bridge the communication with various Dapr input/output bindings or pubsub brokers components.

- Async Function Quickstart: <https://openfunction-talks.netlify.app/2022/202-node-async/>
- Async Function Samples: <https://github.com/OpenFunction/samples/tree/main/functions/async/mqtt-io-node>

## 0.3.6 / 2022-03-07

functions-framework-nodejs v0.3.6 changes npm package from @google-cloud/functions-framework to @openfunction/functions-framework

- Buildpacks Builder: `openfunction/builder-node:v2-16.13`
- Knative Function Samples: <https://github.com/OpenFunction/samples/tree/main/functions/Knative/hello-world-node>
  