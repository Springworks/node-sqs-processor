'use strict';

var logPayload = require('./util/logging-util.js').formattedPayload;


/**
 * @param {Object}       message_capture  message_capture
 * @param {Object}       timeout_handler  timeout_handler
 * @param {EventEmitter} emitter          An event emitter
 * @param  {Object}      config           Config object.
 * @param  {Bunyan}      logger           Bunyan logger instance.
 * @return {Object} Object with `startProcessingQueue` and `stopAfterCurrentBatch`.
 */
exports.create = function(message_capture, timeout_handler, emitter, config, logger) {
  var queue_name = config.queue_name,
      is_running = false;

  return {
    startProcessingQueue: startProcessingQueue,
    stopAfterCurrentBatch: stopAfterCurrentBatch
  };


  /**
   * Start processing queue
   */
  function startProcessingQueue() {
    if (!is_running) {
      is_running = true;
      receiveNextBatch();
    }
  }


  /**
   * Stop processing queue after the current message batch is done.
   */
  function stopAfterCurrentBatch() {
    is_running = false;
  }


  /**
   * Fetches next message batch. Will make a recursive call to fetch next batch
   * once it's done, or trigger a timeout to fetch new messages if anything
   * gets takes too long (e.g. a dead fork).
   */
  function receiveNextBatch() {
    var timeout_stop_function,
        handled = false;

    // Ensure that process isn't waiting to be killed
    if (!is_running) {
      logger.info('Stopping receiveNextBatch(), pending process death');
      return;
    }

    logger.info(logPayload({ queue_name: queue_name }), 'Receiving next message batch');

    timeout_stop_function = timeout_handler.start(function(err) {
      handled = true;

      if (err) {
        logger.error(err);
        emitter.emit('error', err);
        return;
      }

      // We don't have to check if the receiveMessageBatch cb
      // has been called sice we can't get here if it has
      // then the timeout_handler should be stopped already thus
      // making it impossible to get in here.
      process.nextTick(receiveNextBatch);
    });

    // Start a timer to automatically fetch new batch
    message_capture.receiveMessageBatch(queue_name, function(err) {
      var local_handled = handled;
      handled = true;

      if (err) {
        logger.warn(err, 'An error occurred during message capturing');
      }

      // Stop the timeout
      timeout_stop_function();

      // Make sure that we do not spawn more threads by running
      // both the timeout 'thread' and the done 'thread'
      if (!local_handled) {
        process.nextTick(receiveNextBatch);
      }
    });
  }
};
