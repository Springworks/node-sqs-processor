'use strict';

const async = require('async');
const logPayloadForSQSMessage = require('../util/logging-util').payloadForSQSMessage;


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
    handleProcessedMessage: handleProcessedMessage,
  };


  /**
   * Process all SQS messages.
   * @param {Array} sqs_messages The messages to save.
   * @param {String} queue_name Name of queue where messages reside.
   * @param {Function} callback Invoked with [err].
   */
  function processMessages(sqs_messages, queue_name, callback) {
    async.eachSeries(sqs_messages, (sqs_message, next) => {
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
      iterator(sqs_message, err => {
        handleProcessedMessage(err, queue_name, sqs_message, callback);
      });
    }
    catch (err) {
      logger.trace(err, 'Error in message processor');
      handleProcessedMessage(err, queue_name, sqs_message, callback);
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
      logger.trace(logPayloadForSQSMessage(sqs_message, err), 'Error processing message');
      callback(); // Don't provide error, since that would make async stop processing entire batch
      return;
    }

    if (!sqs_message || !sqs_message.ReceiptHandle) {
      logger.warn(logPayloadForSQSMessage(sqs_message),
          'Missing sqs_message or sqs_message.ReceiptHandle');
      callback(); // Don't provide error, since that would make async stop processing entire batch
      return;
    }

    // Remove stored message from queue
    message_queue.deleteMessage(queue_name, sqs_message.ReceiptHandle, delete_err => {
      if (delete_err) {
        logger.warn(logPayloadForSQSMessage(sqs_message, delete_err), 'Error deleting message');
      }
      callback(); // Don't pass along error, since that would stop async
    });
  }
};
