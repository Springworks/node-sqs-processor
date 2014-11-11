'use strict';

var joi = require('input-validator').joi;


module.exports = joi.object().required().options({
  presence: 'optional'
}).description('Module config').keys({

  queue_name: joi.string()
    .required()
    .description('Name of the SQS queue'),

  region: joi.string()
    .default('eu-west-1')
    .description('AWS region'),

  api_version: joi.string()
    .default('2012-11-05')
    .description('AWS SQS API version'),

  batch_timeout: joi.number()
    .integer()
    .min(0)
    .default(60000)
    .description('Timeout after which a new batch will be forced to start')
    .unit('milliseconds'),

  batch_force_threshold: joi.number()
    .integer()
    .min(0)
    .default(5)
    .description('An error is emitted if batches timeout this many times in a row'),

  visibility_timeout: joi.number()
    .integer()
    .min(0).max(43200)
    .default(30)
    .description('The visibility timeout for the queue')
    .unit('seconds'),

  wait_time_seconds: joi.number()
    .integer()
    .min(0)
    .default(20)
    .description('Long-polling timeout (0 = short-polling)')
    .unit('seconds'),

  max_nof_messages: joi.number()
    .integer()
    .min(1).max(10)
    .default(10)
    .description('Max messages to receive per request'),

  attribute_names: joi.array()
    .includes(joi.string().valid([
      'All',
      'ApproximateFirstReceiveTimestamp',
      'ApproximateReceiveCount',
      'SenderId',
      'SentTimestamp'
    ]))
    .default(['All'])
    .description('Attributes to be returned along with each message')

});
