# Changelog

[npm history][1]

[1]: https://www.npmjs.com/package/@openfunction/functions-framework?activeTab=versions

## 0.5.0 / 2022-05-27

We are having a standalone `openfunction` signature type starting from this release!

Now you can use `function (ctx, data)` as the function signature along with `openfunction` signature type, this allows you to use sync functions in a far more flexible way - whenever there are functions output requirements, sync functions can also send output to Dapr output binding or pubsub components.

Check the demo of HTTP request triggering async function:

- Quickstart: <https://openfunction-talks.netlify.app/2022/203-node-mixed/>
- Sample: <https://github.com/OpenFunction/samples/tree/main/functions/knative/with-output-binding-node>

## 0.4.1 / 2022-04-17

This feature release offically introduces the support of OpenFunction async function runtime, now your Node.js functions can enjoy the power of Dapr runtime starting from bindings and pubsub. Functions Framework will call [Dapr Node.js SDK](https://github.com/dapr/js-sdk) to bridge the communication with various Dapr input/output bindings or pubsub brokers components.

- Aysnc Function Quickstart: <https://openfunction-talks.netlify.app/2022/202-node-async/>
- Async Function Samples: <https://github.com/OpenFunction/samples/tree/main/functions/async/mqtt-io-node>

## 0.3.6 / 2022-03-07

functions-framework-nodejs v0.3.6 changes npm package from @google-cloud/functions-framework to @openfunction/functions-framework

- Buildpacks Builder: `openfunction/builder-node:v2-16.13`
- Knative Function Samples: <https://github.com/OpenFunction/samples/tree/main/functions/Knative/hello-world-node>
  