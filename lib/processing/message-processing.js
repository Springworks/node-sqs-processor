'use strict';

var async = require('async');
var logPayloadForSQSMessage = require('../util/logging-util.js').payloadForSQSMessage;


/**
 * Manages storage of messages in the data store API.
 * @param  {Function} iterator       Message iterator function
 * @param  {Object}   message_queue  message_queue
 * @param  {Bunyan}   logger         logger
 * @return {Object}                  methods
 */
exports.create = function(iterator, message_queue, logger) {
  return {
    processMessages: processMessages,
    processMessage: processMessage,
    handleProcessedMessage: handleProcessedMessage
  };


  /**
   * Process all SQS messages.
   * @param {Array} sqs_messages The messages to save.
   * @param {String} queue_name Name of queue where messages reside.
   * @param {Function} callback Invoked with [err].
   */
  function processMessages(sqs_messages, queue_name, callback) {
    async.eachSeries(sqs_messages, function(sqs_message, next) {
      processMessage(queue_name, sqs_message, next);
    }, callback);
  }


  /**
   * Processes SQS message using an appropriate processor.
   * @param {String}   queue_name  Name of the queue.
   * @param {Object}   sqs_message Message to persist.
   * @param {Function} callback    Invokes next message in async series.
   */
  function processMessage(queue_name, sqs_message, callback) {
    logger.info(logPayloadForSQSMessage(sqs_message), 'Process message');

    try {
      iterator(sqs_message, function(err) {
        handleProcessedMessage(err, queue_name, sqs_message.ReceiptHandle, callback);
      });
    }
    catch (err) {
      logger.error(err, 'Error in message processor');
      handleProcessedMessage(err, queue_name, sqs_message.ReceiptHandle, callback);
    }
  }


  /**
   * @param {Object}   err            Any error.
   * @param {String}   queue_name     Name of the message's queue.
   * @param {Object}   sqs_message    The SQS message.
   * @param {Function} callback       Invokes next message in async series.
   */
  function handleProcessedMessage(err, queue_name, sqs_message, callback) {
    if (err) {
      logger.warn(logPayloadForSQSMessage(sqs_message, err), 'Error processing message');
      callback(); // Don't pass along error, since that would stop async
      return;
    }

    logger.trace('handleProcessedMessage in queue %s, handle %s',
        queue_name,
        sqs_message.ReceiptHandle);

    // Remove stored message from queue
    message_queue.deleteMessage(queue_name, sqs_message.ReceiptHandle, function(err) {
      logger.trace(err, 'deleteMessage done');
      if (err) {
        logger.warn(logPayloadForSQSMessage(sqs_message, err), 'Error deleting message');
      }
      callback(); // Don't pass along error, since that would stop async
    });
  }
};
