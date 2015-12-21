'use strict';


/**
 * @param  {Object} sqs_handler sqs_handler
 * @param  {Bunyan} logger      A bunyan logger
 * @return {Object}             Methods
 */
exports.create = function(sqs_handler, logger) {
  return {
    receiveQueueMessages: receiveQueueMessages,
    deleteMessage: deleteMessage,
  };


  /**
   * Function for receiving messages from a queue by specifying its name.
   *
   * @type {Function}
   * @param {String} queue_name Name of queue to get messages from.
   * @param {Function} callback Invoked with [err, messages].
   */
  function receiveQueueMessages(queue_name, callback) {
    const queue_url_params = sqs_handler.getQueueUrlParams(queue_name);

    // Get queue URL first and then load messages
    sqs_handler.getQueueUrl(queue_url_params, function(url_err, queue_url) {
      if (url_err) {
        logger.warn(url_err, 'Error loading url for queue %s:', queue_url_params.QueueName);
        callback(url_err, null);
        return;
      }

      sqs_handler.receiveMessageBatch(queue_url, function(err, data) {
        if (err) {
          logger.warn(err, 'Error receiving messages from %s:', queue_url);
          callback(err, null);
          return;
        }
        if (data && Array.isArray(data.Messages)) {
          callback(null, data.Messages);
          return;
        }
        if (!data) {
          logger.warn(data, 'No data in SQS response when getting messages');
          callback(new Error('Invalid SQS response'), null);
          return;
        }
        callback(null, []);
      });
    });
  }


  /**
   * Deletes a message from the SQS queue.
   * @param {String} queue_name Name of message's queue.
   * @param {String} receipt_handle Receipt handle for message.
   * @param {String} callback Invoked with [err] once done.
   */
  function deleteMessage(queue_name, receipt_handle, callback) {
    // Get queue URL first and then load messages
    const queue_url_params = sqs_handler.getQueueUrlParams(queue_name);
    sqs_handler.getQueueUrl(queue_url_params, function(err, queue_url) {
      if (err) {
        logger.warn(err, 'Error loading url for queue %s:', queue_url_params.QueueName, err);
        callback(err);
        return;
      }
      sqs_handler.deleteMessage(queue_url, receipt_handle, callback);
    });
  }
};
