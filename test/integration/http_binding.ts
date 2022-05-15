import {deepStrictEqual} from 'assert';

import * as sinon from 'sinon';
import * as supertest from 'supertest';
import * as shell from 'shelljs';
import {cloneDeep, forEach, set} from 'lodash';

import {OpenFunctionContext} from '../../src/openfunction/function_context';

import {OpenFunctionRuntime} from '../../src/functions';
import {getServer} from '../../src/server';

const TEST_CONTEXT: OpenFunctionContext = {
  name: 'test-context',
  version: '1.0.0',
  runtime: 'Knative',
  outputs: {
    file1: {
      componentName: 'local',
      componentType: 'bindings.localstorage',
      metadata: {
        fileName: 'my-file1.txt',
      },
    },
    file2: {
      componentName: 'local',
      componentType: 'bindings.localstorage',
      metadata: {
        fileName: 'my-file2.txt',
      },
    },
  },
};
const TEST_PAYLOAD = {echo: 'hello world'};

describe('OpenFunction - HTTP Binding', () => {
  const APPID = 'http.dapr';

  before(done => {
    if (shell.exec('dapr', {silent: true}).code !== 0)
      throw new Error('Please ensure "dapr" is installed');

    // Try to run Dapr sidecar on port 3500 with components for testing
    shell.exec(
      `dapr run -H 3500 -G 50001 -d ./test/data/components/http -a ${APPID}`,
      {
        silent: true,
        async: true,
      }
    );

    // Wait 5 seconds for dapr sidecar to start
    setTimeout(done, 5000);
  });

  after(() => {
    // Stop dapr sidecar process
    shell.exec(`dapr stop ${APPID}`, {
      silent: true,
    });
  });

  beforeEach(() => {
    // Prevent log spew from the PubSub emulator request.
    sinon.stub(console, 'error');
  });
  afterEach(() => {
    (console.error as sinon.SinonSpy).restore();
  });

  const testData = [
    {name: 'Save data', operation: 'create', listable: true},
    {name: 'Get data', operation: 'get', listable: true},
    {name: 'Delete data', operation: 'delete', listable: false},
  ];

  testData.forEach(test => {
    it(test.name, async () => {
      const context = cloneDeep(TEST_CONTEXT);
      forEach(context.outputs, output =>
        set(output, 'operation', test.operation)
      );

      const server = getServer(
        async (ctx: OpenFunctionRuntime, data: {}) => {
          await ctx.send(data);
          return ctx.response(data);
        },
        'http',
        context
      );

      await supertest(server)
        .post('/')
        .send(TEST_PAYLOAD)
        .expect(200)
        .expect(res => {
          deepStrictEqual(res.body, TEST_PAYLOAD);
        });

      forEach(context.outputs, output => {
        const listable = shell.ls(output.metadata!.fileName).code === 0;
        deepStrictEqual(listable, test.listable);
      });
    });
  });
});
