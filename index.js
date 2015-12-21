'use strict';

const EventEmitter = require('events').EventEmitter;
const SQS = require('aws-sdk').SQS;
const validator = require('@springworks/input-validator');
const config_schema = require('./lib/config-schema');
const SqsHandler = require('./lib/queue/sqs-handler');
const MessageQueue = require('./lib/queue/message-queue');
const MessageProcessing = require('./lib/processing/message-processing');
const MessageCapture = require('./lib/message-capture');
const SqsTimeoutHandler = require('./lib/sqs-timeout-handler');
const SqsProcessor = require('./lib/sqs-processor');
const internals = {};


/**
 * Create module
 * @param  {Function}  iterator  Function used to process a single message.
 *                               The function is given a message and a callback.
 *                               The callback must be invoked when done.
 *                               If an error is passed to the callback then the
 *                               message is not deleted from the SQS queue.
 * @param  {Object}    config    Module config.
 * @param  {Bunyan}    logger    Bunyan logger instance.
 * @return {Object}              Object with the methods `startProcessingQueue` and
 *                               `stopAfterCurrentBatch`.
 * @throws {Error} If config object is invalid.
 */
exports.create = function(iterator, config, logger) {
  const validated_config = validator.validateSchema(config, config_schema);
  const sqs = new SQS({
    region: validated_config.region,
    apiVersion: validated_config.api_version,
  });

  return internals.create(sqs, iterator, validated_config, logger);
};


/**
 * Create module with an instance of SQS.
 * @param  {SQS}       sqs       SQS instance.
 * @param  {Function}  iterator  See above.
 * @param  {Object}    config    Validated config object.
 * @param  {Bunyan}    logger    See above.
 * @return {Object}              See above.
 */
internals.create = function(sqs, iterator, config, logger) {
  const emitter = new EventEmitter();
  const sqs_handler = SqsHandler.create(sqs, config, logger);
  const message_queue = MessageQueue.create(sqs_handler, logger);
  const message_processing = MessageProcessing.create(iterator, message_queue, logger);
  const message_capture = MessageCapture.create(message_queue, message_processing, logger);
  const sqs_timeout_handler = SqsTimeoutHandler.create(config, logger);
  const sqs_processor = SqsProcessor.create(message_capture, sqs_timeout_handler, emitter, config, logger);

  emitter.startProcessingQueue = sqs_processor.startProcessingQueue;
  emitter.stopAfterCurrentBatch = sqs_processor.stopAfterCurrentBatch;

  return emitter;
};


/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') {
  exports.internals = internals;
}
