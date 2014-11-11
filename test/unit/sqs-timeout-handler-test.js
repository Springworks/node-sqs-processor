'use strict';

var chai = require('chai'),
    sinon = require('sinon');

var sqs_timeout_handler_module = require('../../lib/sqs-timeout-handler.js'),
    test_util = require('../../test-util/test-util.js');

chai.should();
chai.use(require('sinon-chai'));


describe('unit/sqs-timeout-handler-test.js', function() {

  var config,
      logger,
      sqs_timeout_handler;

  beforeEach(function() {
    config = test_util.getTestConfig();
    logger = {};

    logger.warn = sinon.stub();
  });

  it('should return a timeout stopper function when starting', function() {
    config.batch_timeout = 1000;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    var stop_function = sqs_timeout_handler.start(function(){});
    stop_function.should.be.a('function');

  });

  it('should warn when timeout is called', function(done) {
    config.batch_timeout = 1;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    var cb = sinon.stub();

    sqs_timeout_handler.start(cb);

    setTimeout(function() {
      logger.warn.should.have.been.calledWithExactly('Forced to fetch a new batch manually');
      done();
    }, 20);

  });

  it('should invoke callback when time runs out', function(done) {
    config.batch_timeout = 1;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    var cb = sinon.stub();
    sqs_timeout_handler.start(cb);

    setTimeout(function() {
      logger.warn.should.have.been.calledWithExactly('Forced to fetch a new batch manually');
      cb.should.have.been.calledWithExactly(null);
      done();
    }, 20);
  });


  it('should not invoke callback when time runs out if it was cancelled first',
    function(done) {

    config.batch_timeout = 10;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    var cb = sinon.stub(),
        stop_function = sqs_timeout_handler.start(cb);

    stop_function();

    setTimeout(function() {
      cb.should.have.callCount(0);
      done();
    }, 20);
  });

  it('should invoke callback with error when more than force_threshould consecutive timeouts',
    function(done) {

    config.batch_timeout = 1;
    config.batch_force_threshold = 3;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    var cb0 = sinon.stub(),
        cb1 = sinon.stub(),
        cb2 = sinon.stub(),
        cb3 = sinon.stub(),
        cb4 = sinon.stub();

    sqs_timeout_handler.start(cb0);
    sqs_timeout_handler.start(cb1);
    sqs_timeout_handler.start(cb2);
    sqs_timeout_handler.start(cb3);
    sqs_timeout_handler.start(cb4);

    setTimeout(function() {
      cb0.should.have.been.calledWithExactly(null);
      cb1.should.have.been.calledWithExactly(null);
      cb2.should.have.been.calledWithExactly(null);
      cb3.should.have.been.calledWithExactly(sinon.match.instanceOf(Error));
      cb4.should.have.been.calledWithExactly(sinon.match.instanceOf(Error));
      done();
    }, 20);
  });

 it('should invoke callback with error when more ' +
    'than force_threshould consecutive timeouts ' +
    'and then return to normal if it starts working', function(done) {

    config.batch_timeout = 1;
    config.batch_force_threshold = 3;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    var cb0 = sinon.stub(),
        cb1 = sinon.stub(),
        cb2 = sinon.stub(),
        cb3 = sinon.stub(),
        cb4 = sinon.stub(),
        cb5 = sinon.stub(),
        stop_function;

    sqs_timeout_handler.start(cb0);

    setTimeout(function() {
      cb0.should.have.been.calledWithExactly(null);
      sqs_timeout_handler.start(cb1);

      setTimeout(function() {
        cb1.should.have.been.calledWithExactly(null);
        sqs_timeout_handler.start(cb2);

        setTimeout(function() {
          cb2.should.have.been.calledWithExactly(null);
          sqs_timeout_handler.start(cb3);

          setTimeout(function() {
            // have error
            cb3.should.have.been.calledWithExactly(sinon.match.instanceOf(Error));
            stop_function = sqs_timeout_handler.start(cb4);

            // clear the timeout
            stop_function();

            // cb4 was cancelled so callback should not have been invoked
            cb4.should.have.callCount(0);

            // start cb5
            sqs_timeout_handler.start(cb5);

            setTimeout(function() {
              // no error again
              cb5.should.have.been.calledWithExactly(null);
              done();
            }, 10); // note short timeout
          }, 10);
        }, 10);
      }, 10);
    }, 10);
  });

});
