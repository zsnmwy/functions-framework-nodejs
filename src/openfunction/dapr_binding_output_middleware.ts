import {Request, Response} from 'express';
import * as interceptor from 'express-interceptor';

import * as Debug from 'debug';
import {isEmpty} from 'lodash';

import {OpenFunctionContext, ContextUtils} from './function_context';
import {OpenFunctionRuntime} from './function_runtime';

const debug = Debug('ofn:middleware:dapr:binding');

/**
 * The handler to invoke Dapr output binding before sending the response.
 * @param req express request object
 * @param res express response object
 */
const daprBindingOutputHandler = (req: Request, res: Response) => {
  return {
    isInterceptable: () => {
      return (
        !isEmpty(res.locals.context?.outputs) &&
        ContextUtils.IsKnativeRuntime(res.locals.context as OpenFunctionContext)
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    intercept: (body: any, send: Function) => {
      const context = res.locals.context;
      const runtime = OpenFunctionRuntime.Parse(context);

      runtime.send(body).then(data => {
        debug('🎩 Dapr results: %j', data);
        send(body);
      });
    },
  };
};

export default interceptor(daprBindingOutputHandler);
