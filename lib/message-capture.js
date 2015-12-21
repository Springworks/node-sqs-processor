'use strict';

const logPayload = require('./util/logging-util').formattedPayload;


/**
 * @param  {Object} message_queue      message_queue
 * @param  {Object} message_processing message_processing
 * @param  {Bunyan} logger             logger
 * @return {Object}                    methods
 */
exports.create = function(message_queue, message_processing, logger) {
  return {
    receiveMessageBatch: receiveMessageBatch,
  };


  /**
   * Recursive call to receive and process messages infinitely.
   * @type {Function}
   * @param {String} queue_name Name of queue to capture messages from.
   * @param {Function} callback Invoked with [err].
   */
  function receiveMessageBatch(queue_name, callback) {
    message_queue.receiveQueueMessages(queue_name, function(err, sqs_messages) {
      let message_count;

      if (err) {
        err.payload = {
          queue_name: queue_name,
        };
        logger.warn(err, 'Error receiving messages for queue %s', queue_name);
        callback(err);
        return;
      }

      message_count = sqs_messages.length;

      logger.info(logPayload({
        queue: queue_name,
        count: message_count,
      }), 'Message batch received');

      // Receive next batch immediately
      if (!message_count) {
        callback();
        return;
      }

      message_processing.processMessages(sqs_messages, queue_name, function() {
        logger.info(logPayload({
          queue: queue_name,
          count: message_count,
        }), 'Done processing message batch');
        callback();
      });
    });
  }
};
