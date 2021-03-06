'use strict';

const joi = require('@springworks/input-validator').joi;
const VALID_ATTR_NAMES = [
  'All',
  'ApproximateFirstReceiveTimestamp',
  'ApproximateReceiveCount',
  'SenderId',
  'SentTimestamp',
];

module.exports = joi.object().required().options({
  presence: 'optional',
}).description('Module config').keys({
  queue_name: joi.string().required().description('Name of the SQS queue'),
  region: joi.string().default('eu-west-1').description('AWS region'),
  api_version: joi.string().default('2012-11-05').description('AWS SQS API version'),
  batch_timeout: joi.number().integer().min(0).default(60000).description('Timeout after which a new batch will be forced to start').unit('milliseconds'),
  batch_force_threshold: joi.number().integer().min(0).default(5).description('An error is emitted if batches timeout this many times in a row'),
  visibility_timeout: joi.number().integer().min(0).max(43200).description('The visibility timeout for the queue').unit('seconds'),
  wait_time_seconds: joi.number().integer().min(0).default(20).description('Long-polling timeout (0 = short-polling)').unit('seconds'),
  max_nof_messages: joi.number().integer().min(1).max(10).default(10).description('Max messages to receive per request'),
  attribute_names: joi.array().items(joi.string().valid(VALID_ATTR_NAMES)).default(['All']).description('Attributes to be returned along with each message'),
});
