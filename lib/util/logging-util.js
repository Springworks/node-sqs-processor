'use strict';


/**
 * @see formattedPayload
 * @type {Function}
 */
exports.formattedPayload = formattedPayload;


/**
 * @see payloadForSQSMessage
 * @type {Function}
 */
exports.payloadForSQSMessage = payloadForSQSMessage;


/**
 * @see payloadDate
 * @type {Function}
 */
exports.payloadDate = payloadDate;


// Implementation


/**
 * Formats the provided data on a format that is analytics-friendly, e.g. for Splunk searches.
 * @param  {Object} data Data to assign to payload.
 * @return {Object} Payload to provide with log message.
 */
function formattedPayload(data) {
  if (!data) {
    return null;
  }
  return {
    payload: data,
  };
}


/**
 * Return a payload object for a SQS message. Can also include an error.
 * @param  {Object} sqs_message The SQS message.
 * @param  {Error=} opt_err     Optional error.
 * @return {Object} Payload to provide with log message.
 */
function payloadForSQSMessage(sqs_message, opt_err) {
  let attr;
  if (!sqs_message) {
    return null;
  }
  attr = sqs_message.Attributes || {};
  return formattedPayload({
    err: opt_err || undefined,
    message_id: sqs_message.MessageId,
    approx_receive_count: attr.ApproximateReceiveCount,
    sent_at: payloadDate(attr.SentTimestamp),
    approx_first_received_at: payloadDate(attr.ApproximateFirstReceiveTimestamp),
  });
}


/**
 * Convert a timestamp to a Date.
 * Return `undefined` if unable to parse timestamp.
 * By using `undefined` as default, the field will be
 * removed when the object is passed to `JSON.stringify`.
 * @param  {Number | String} timestamp The timestamp.
 * @return {Date} Parsed timestamp or `undefined`.
 */
function payloadDate(timestamp) {
  if (!timestamp) {
    return undefined;
  }
  timestamp = new Date(timestamp);
  if (isNaN(timestamp.getTime())) {
    return undefined;
  }
  return timestamp;
}
