'use strict';


/**
 * Internal module managing the logic of an MQTT queue.
 * @param  {AWS.SQS} aws_sqs Instance of AWS.SQS
 * @param  {Object}  config  Config object
 * @param  {Bunyan}  logger  logger
 * @return {Object}          Methods
 */
exports.create = function(aws_sqs, config, logger) {
  const opt_visibility_timeout = config.visibility_timeout;
  const wait_time_seconds = config.wait_time_seconds;
  const attribute_names = config.attribute_names;
  const max_nof_messages = config.max_nof_messages;

  return {
    getQueueUrl: getQueueUrl,
    receiveMessageBatch: receiveMessageBatch,
    getQueueUrlParams: getQueueUrlParams,
    getReceiveMessageParams: getReceiveMessageParams,
    deleteMessage: deleteMessage,
  };


  /**
   * Receives the next batch of messages. Uses long-polling to grab a number
   * of messages.
   * @type {Function}
   * @param {String} queue_url URL of the queue to get messages from.
   * @param {Function} callback Invoked with [err, data].
   */
  function receiveMessageBatch(queue_url, callback) {
    let params;
    params = getReceiveMessageParams(queue_url);
    aws_sqs.receiveMessage(params, callback);
  }


  /**
   * Gets URL of the queue to process.
   * @type {Function}
   * @param {Object} params Params needed by queue URL req.
   * @param {Function} callback Invoked with [err, queue_url].
   */
  function getQueueUrl(params, callback) {
    // TODO: Cache queue_url?

    aws_sqs.getQueueUrl(params, (err, data) => {
      if (err) {
        callback(err);
        return;
      }

      callback(null, data.QueueUrl);
    });
  }


  /**
   * @type {Function}
   * @param {String} queue_url URL to the SQS queue.
   * @return {Object} Parameters to provide to receiveMessage().
   */
  function getReceiveMessageParams(queue_url) {
    const params = {
      QueueUrl: queue_url,
      WaitTimeSeconds: wait_time_seconds,
      AttributeNames: attribute_names,
      MaxNumberOfMessages: max_nof_messages,
    };

    if (opt_visibility_timeout) {
      params.VisibilityTimeout = opt_visibility_timeout;
    }

    return params;
  }


  /**
   *
   * @type {Function}
   * @param {String} queue_name Name of queue.
   * @return {Object} Params required to load queue url.
   */
  function getQueueUrlParams(queue_name) {
    return {
      QueueName: queue_name,
    };
  }


  /**
   * Deletes a message from the SQS queue.
   * @param {String} queue_url URL to queue holding the message.
   * @param {String} receipt_handle Receipt gotten when receiving message.
   * @param {Function} callback Invoked when done, with [err].
   */
  function deleteMessage(queue_url, receipt_handle, callback) {
    // delete message from queue
    aws_sqs.deleteMessage({
      QueueUrl: queue_url,
      ReceiptHandle: receipt_handle,
    }, (err, data) => {
      callback(err, null);
    });
  }
};
