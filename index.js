'use strict';

var EventEmitter = require('events').EventEmitter;
var SQS = require('aws-sdk').SQS;
var validator = require('input-validator');
var config_schema = require('./lib/config-schema.js');
var internals = {};


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
  var sqs;

  config = validator.validateSchema(config, config_schema);

  sqs = new SQS({
    region: config.region,
    apiVersion: config.api_version
  });

  return internals.create(sqs, iterator, config, logger);
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
  var sqs_handler,
      message_queue,
      message_processing,
      message_capture,
      sqs_timeout_handler,
      sqs_processor,
      emitter = new EventEmitter();

  sqs_handler = require('./lib/queue/sqs-handler.js').create(
      sqs,
      config,
      logger);

  message_queue = require('./lib/queue/message-queue.js').create(
      sqs_handler,
      logger);

  message_processing = require('./lib/processing/message-processing.js').create(
      iterator,
      message_queue,
      logger);

  message_capture = require('./lib/message-capture.js').create(
      message_queue,
      message_processing,
      logger);

  sqs_timeout_handler = require('./lib/sqs-timeout-handler.js').create(
      config,
      logger);

  sqs_processor = require('./lib/sqs-processor.js').create(
      message_capture,
      sqs_timeout_handler,
      emitter,
      config,
      logger);

  emitter.startProcessingQueue = sqs_processor.startProcessingQueue;
  emitter.stopAfterCurrentBatch = sqs_processor.stopAfterCurrentBatch;

  return emitter;
};


/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') {
  /** @protected */
  exports.internals = internals;
}
