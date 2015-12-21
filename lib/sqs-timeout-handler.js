'use strict';

const createError = require('@springworks/error-factory').createError;


/**
 * Create a timeout handler
 * @param  {Object}   config            Config object.
 * @param  {Bunyan}   logger            Bunyan logger instance.
 * @return {Object}                     Methods
 */
exports.create = function(config, logger) {
  const batch_timeout = config.batch_timeout;
  const batch_force_threshold = config.batch_force_threshold;
  let force_count = 0;

  return {
    start: start,
  };

  /**
   * Start a new callback
   * @param  {Function} callback    when timeout ends
   * @return {Function} stop_timer  a function to stop the timeout from invoking
   */
  function start(callback) {
    const timeout_id = setTimeout(function() {
      forceNext(callback);
    }, batch_timeout);

    return function() {
      // if someone stops a callback then that means that
      // they have taken care of it and we can reset force count
      force_count = 0;
      clearTimeout(timeout_id);
    };
  }

  function forceNext(callback) {
    force_count++;
    if (force_count > batch_force_threshold) {
      callback(createError({ code: 418, message: 'Forced to fetch above threshold' }));
      return;
    }

    logger.warn('Forced to fetch a new batch manually');
    callback(null);
  }
};
