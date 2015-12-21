'use strict';

const sqs_timeout_handler_module = require('../../lib/sqs-timeout-handler');
const test_util = require('../../test-util/test-util');

describe('test/unit/sqs-timeout-handler-test.js', () => {
  let config;
  let logger;
  let sqs_timeout_handler;

  beforeEach(() => {
    config = test_util.getTestConfig();
    logger = {};

    logger.warn = sinon.stub();
  });

  it('should return a timeout stopper function when starting', () => {
    config.batch_timeout = 1000;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    const stop_function = sqs_timeout_handler.start(() => {
    });
    stop_function.should.be.a.Function();
  });

  it('should warn when timeout is called', done => {
    config.batch_timeout = 1;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    const cb = sinon.stub();

    sqs_timeout_handler.start(cb);

    setTimeout(() => {
      logger.warn.should.be.calledWithExactly('Forced to fetch a new batch manually');
      done();
    }, 20);
  });

  it('should invoke callback when time runs out', done => {
    config.batch_timeout = 1;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    const cb = sinon.stub();
    sqs_timeout_handler.start(cb);

    setTimeout(() => {
      logger.warn.should.be.calledWithExactly('Forced to fetch a new batch manually');
      cb.should.be.calledWithExactly(null);
      done();
    }, 20);
  });


  it('should not invoke callback when time runs out if it was cancelled first', done => {
    config.batch_timeout = 10;
    config.batch_force_threshold = 5;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    const cb = sinon.stub();
    const stop_function = sqs_timeout_handler.start(cb);

    stop_function();

    setTimeout(() => {
      cb.should.have.callCount(0);
      done();
    }, 20);
  });

  it('should invoke callback with error when more than force_threshould consecutive timeouts', done => {
    config.batch_timeout = 1;
    config.batch_force_threshold = 3;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    const cb0 = sinon.stub();
    const cb1 = sinon.stub();
    const cb2 = sinon.stub();
    const cb3 = sinon.stub();
    const cb4 = sinon.stub();

    sqs_timeout_handler.start(cb0);
    sqs_timeout_handler.start(cb1);
    sqs_timeout_handler.start(cb2);
    sqs_timeout_handler.start(cb3);
    sqs_timeout_handler.start(cb4);

    setTimeout(() => {
      cb0.should.be.calledWithExactly(null);
      cb1.should.be.calledWithExactly(null);
      cb2.should.be.calledWithExactly(null);
      cb3.should.be.calledWithExactly(sinon.match.instanceOf(Error));
      cb4.should.be.calledWithExactly(sinon.match.instanceOf(Error));
      done();
    }, 20);
  });

  it('should invoke callback with error when more than force_threshould consecutive timeouts and then return to normal if it starts working', done => {
    config.batch_timeout = 1;
    config.batch_force_threshold = 3;
    sqs_timeout_handler = sqs_timeout_handler_module.create(config, logger);

    const cb0 = sinon.stub();
    const cb1 = sinon.stub();
    const cb2 = sinon.stub();
    const cb3 = sinon.stub();
    const cb4 = sinon.stub();
    const cb5 = sinon.stub();
    let stop_function;

    sqs_timeout_handler.start(cb0);

    setTimeout(() => {
      cb0.should.be.calledWithExactly(null);
      sqs_timeout_handler.start(cb1);

      setTimeout(() => {
        cb1.should.be.calledWithExactly(null);
        sqs_timeout_handler.start(cb2);

        setTimeout(() => {
          cb2.should.be.calledWithExactly(null);
          sqs_timeout_handler.start(cb3);

          setTimeout(() => {
            // have error
            cb3.should.be.calledWithExactly(sinon.match.instanceOf(Error));
            stop_function = sqs_timeout_handler.start(cb4);

            // clear the timeout
            stop_function();

            // cb4 was cancelled so callback should not have been invoked
            cb4.should.have.callCount(0);

            // start cb5
            sqs_timeout_handler.start(cb5);

            setTimeout(() => {
              // no error again
              cb5.should.be.calledWithExactly(null);
              done();
            }, 10); // note short timeout
          }, 10);
        }, 10);
      }, 10);
    }, 10);
  });

});
