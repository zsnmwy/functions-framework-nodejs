module.exports = {
  knative: {
    FUNC_CONTEXT: JSON.stringify({
      name: 'test-knative',
      version: '1.0.0',
      runtime: 'Knative',
      outputs: {
        fs: {
          componentName: 'local',
          componentType: 'bindings.localstorage',
          operation: 'list',
          metadata: {
            fileName: '.',
          },
        },
      },
    }),
  },
  async: {
    FUNC_CONTEXT: JSON.stringify({
      name: 'test-async',
      version: '1.0.0',
      runtime: 'Async',
      port: '8080',
      inputs: {
        cron: {
          uri: 'cron_input',
          componentName: 'binding-cron',
          componentType: 'bindings.cron',
        },
      },
    }),
  },
};
