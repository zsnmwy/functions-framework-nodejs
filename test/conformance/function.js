/* eslint-disable node/no-missing-require */
const fs = require('fs');

const debug = require('debug')('test:conformance');

const functions = require('@openfunction/functions-framework');
const fileName = 'function_output.json';

functions.http('writeHttpDeclarative', (req, res) => {
  writeJson(req.body);
  res.sendStatus(200);
});

functions.cloudEvent('writeCloudEventDeclarative', cloudEvent => {
  cloudEvent.datacontenttype = 'application/json';
  writeJson(cloudEvent);
});

function writeHttp(req, res) {
  writeJson(req.body);
  res.sendStatus(200);
}

function writeCloudEvent(cloudEvent) {
  cloudEvent.datacontenttype = 'application/json';
  writeJson(cloudEvent);
}

function writeLegacyEvent(data, context) {
  const content = {
    data: data,
    context: {
      eventId: context.eventId,
      timestamp: context.timestamp,
      eventType: context.eventType,
      resource: context.resource,
    },
  };
  writeJson(content);
}

function writeJson(content) {
  const json = JSON.stringify(content);
  fs.writeFileSync(fileName, json);
}

function tryKnative(req, res) {
  debug('✅ Function should receive request: %o', req.body);
  res.send(req.body);
}

function tryAsync(ctx, data) {
  debug('✅ Function should receive from "%o": %o', ctx.inputs, data);
}

module.exports = {
  writeHttp,
  writeCloudEvent,
  writeLegacyEvent,
  tryKnative,
  tryAsync,
};
