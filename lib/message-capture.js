'use strict';



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
    message_queue.receiveQueueMessages(queue_name, (err, sqs_messages) => {
      if (err) {
        err.payload = {
          queue: queue_name,
        };
        logger.trace(err, 'Error receiving messages for SQS queue');
        callback(err);
        return;
      }

      const message_count = sqs_messages.length;

      // Receive next batch immediately
      if (!message_count) {
        callback();
        return;
      }

      message_processing.processMessages(sqs_messages, queue_name, () => {
        callback();
      });
    });
  }
};
