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
    const receive_start_time = Date.now();
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

      const receive_duration_millis = Date.now() - receive_start_time;
      logger.info(logPayload({
        queue: queue_name,
        count: message_count,
        receive_start_time: new Date(receive_start_time),
        receive_duration_seconds: receive_duration_millis / 1000,
      }), 'Message batch received');

      const processing_start_time = Date.now();
      message_processing.processMessages(sqs_messages, queue_name, () => {
        const processing_duration_millis = Date.now() - processing_start_time;
        logger.info(logPayload({
          queue: queue_name,
          count: message_count,
          receive_start_time: new Date(receive_start_time),
          processing_start_time: new Date(processing_start_time),
          processing_duration_seconds: processing_duration_millis / 1000,
        }), 'Done processing message batch');
        callback();
      });
    });
  }
};
