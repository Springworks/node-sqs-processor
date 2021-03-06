'use strict';

const validator = require('@springworks/input-validator');
const config_schema = require('../lib/config-schema');


/**
 * Get a config object for testing.
 *
 * @return  {Object}  A valid config object.
 */
exports.getTestConfig = function() {
  const config = {
    queue_name: 'test_queue_name',
    batch_timeout: 10,
    batch_force_threshold: 3,
    visibility_timeout: 5,
    wait_time_seconds: 5,
  };

  return validator.validateSchema(config, config_schema);
};
