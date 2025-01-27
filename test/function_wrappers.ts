import * as assert from 'assert';
import * as sinon from 'sinon';
import {Request, Response} from 'express';

import {OpenFunctionContext} from '../src/openfunction/context';

import {Context, CloudEvent, OpenFunctionRuntime} from '../src/functions';
import {wrapUserFunction} from '../src/function_wrappers';

describe('wrapUserFunction', () => {
  const CLOUD_EVENT = {
    specversion: '1.0',
    type: 'foobar',
    source: '//somewhere/',
    id: 'aaaaaa-1111-bbbb-2222-cccccccccccc',
    time: '1970-01-01T00:00:00.000Z',
    datacontenttype: 'application/json',
    data: {
      hello: 'world',
    },
  };

  const OPENFUNCTION_CONTEXT: OpenFunctionContext = {
    name: 'test-context',
    version: '1.0.0',
    runtime: 'Knative',
  };

  const createRequest = (body: object) =>
    ({
      body,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      header: (_: string) => '',
    } as Request);

  const createResponse = () =>
    ({
      locals: {
        functionExecutionFinished: false,
      },
      sendStatus: sinon.spy(),
    } as unknown as Response);

  it('correctly wraps an http function', done => {
    const request = createRequest({foo: 'bar'});
    const response = createResponse();
    const func = wrapUserFunction((req: Request, res: Response) => {
      assert.deepStrictEqual(req, request);
      assert.deepStrictEqual(res, response);
      done();
    }, 'http');
    func(request, response, () => {});
  });

  it('correctly wraps an async background function', done => {
    const request = createRequest({context: 'context', data: 'data'});
    const response = createResponse();
    const func = wrapUserFunction(async (data: {}, context: Context) => {
      assert.deepStrictEqual(data, 'data');
      assert.deepStrictEqual(context, 'context');
      // await to make sure wrapper handles async code
      await new Promise(resolve => setTimeout(resolve, 20));
      done();
    }, 'event');
    func(request, response, () => {});
  });

  it('correctly wraps a background function with callback', done => {
    const request = createRequest({context: 'context', data: 'data'});
    const response = createResponse();
    const func = wrapUserFunction(
      (data: {}, context: Context, callback: Function) => {
        // timeout to make sure wrapper waits for callback
        setTimeout(() => {
          assert.deepStrictEqual(data, 'data');
          assert.deepStrictEqual(context, 'context');
          callback();
          done();
        }, 20);
      },
      'event'
    );
    func(request, response, () => {});
  });

  it('correctly wraps an async CloudEvent function', done => {
    const request = createRequest(CLOUD_EVENT);
    const response = createResponse();
    const func = wrapUserFunction(
      async (cloudEvent: CloudEvent<typeof CLOUD_EVENT.data>) => {
        assert.deepStrictEqual(cloudEvent, CLOUD_EVENT);
        // await to make sure wrapper handles async code
        await new Promise(resolve => setTimeout(resolve, 20));
        done();
      },
      'cloudevent'
    );
    func(request, response, () => {});
  });

  it('correctly wraps a CloudEvent function with callback', done => {
    const request = createRequest(CLOUD_EVENT);
    const response = createResponse();
    const func = wrapUserFunction(
      (cloudEvent: CloudEvent<typeof CLOUD_EVENT.data>, callback: Function) => {
        // timeout to make sure wrapper waits for callback
        setTimeout(() => {
          assert.deepStrictEqual(cloudEvent, CLOUD_EVENT);
          callback();
          done();
        }, 20);
      },
      'cloudevent'
    );
    func(request, response, () => {});
  });

  it('correctly wraps an OpenFunctionn function', done => {
    const request = createRequest(CLOUD_EVENT);
    const response = createResponse();
    const func = wrapUserFunction(
      async (context: OpenFunctionRuntime, data: {}) => {
        assert.deepStrictEqual(data, CLOUD_EVENT);
        assert.deepStrictEqual(context.req?.body, CLOUD_EVENT);
        // await to make sure wrapper handles async code
        await new Promise(resolve => setTimeout(resolve, 20));
        done();
      },
      'openfunction',
      OPENFUNCTION_CONTEXT
    );
    func(request, Object.assign(response, {end: () => {}}), () => {});
  });
});
