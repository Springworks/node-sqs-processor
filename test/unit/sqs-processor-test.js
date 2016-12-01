'use strict';

const sqs_processor_module = require('../../lib/sqs-processor');
const test_util = require('../../test-util/test-util');

describe('test/unit/sqs-processor-test.js', () => {
  let sqs_processor;
  let message_capture_mock;
  let logger_mock;
  let sqs_timeout_handler_mock;
  let emitter_mock;

  beforeEach(() => {
    logger_mock = {};
    logger_mock.info = sinon.stub();
    logger_mock.warn = sinon.stub();
    logger_mock.error = sinon.stub();
    logger_mock.trace = sinon.stub();
    logger_mock.fatal = sinon.stub();
    message_capture_mock = {};
    message_capture_mock.receiveMessageBatch = null;

    sqs_timeout_handler_mock = {};
    sqs_timeout_handler_mock.start = null;

    emitter_mock = {
      emit: sinon.stub(),
    };

    sqs_processor = sqs_processor_module.create(message_capture_mock,
        sqs_timeout_handler_mock,
        emitter_mock,
        test_util.getTestConfig(),
        logger_mock);
  });

  describe('starting', () => {

    it('should receive the next message batch directly when it is started', done => {
      const stopper_func = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();
      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).returns(stopper_func);

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);
      sqs_timeout_handler_mock.start.should.be.calledWith(sinon.match.func);

      process.nextTick(() => {
        message_capture_mock.receiveMessageBatch.callArgWith(1, null);
        stopper_func.should.be.calledWith();
        done();
      });

    });


    it('should warn if no messages can be fetched', done => {
      const stopper_func = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).returns(stopper_func);

      // call to start chain
      sqs_processor.startProcessingQueue();
      sqs_processor.stopAfterCurrentBatch();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      process.nextTick(() => {
        message_capture_mock.receiveMessageBatch.callArgWith(1, new Error('smackzors'));
        logger_mock.trace.should.be.calledWith(new Error('smackzors'), sinon.match('receiveNextBatch failed'));
        done();
      });

    });

    it('should fetch a new message batch when done with current batch', done => {
      const stopper_func0 = sinon.stub();
      const stopper_func1 = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onFirstCall().returns(stopper_func0);
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onSecondCall().returns(stopper_func1);

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      setImmediate(() => {
        message_capture_mock.receiveMessageBatch.callArgWith(1, null);
        stopper_func0.should.be.calledWith();
        setTimeout(() => {
          message_capture_mock.receiveMessageBatch.should.have.callCount(2);
          sqs_processor.stopAfterCurrentBatch();
          done();
        }, 1010);
      });
    });

    it('should fetch a new message batch when done with current batch even if there is an error but delayed', done => {
      const stopper_func0 = sinon.stub();
      const stopper_func1 = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onFirstCall().returns(stopper_func0);
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onSecondCall().returns(stopper_func1);

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      setImmediate(() => {
        message_capture_mock.receiveMessageBatch.callArgWith(1, new Error('message'));
        stopper_func0.should.be.calledOnce();
      });

      setTimeout(() => {
        message_capture_mock.receiveMessageBatch.should.have.callCount(1);
      }, 2);

      setTimeout(() => {
        message_capture_mock.receiveMessageBatch.should.have.callCount(2);
        done();
      }, 1010);

    });

    it('should ignore a second call to startProcessingQueue', () => {
      const stopper_func = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();
      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onFirstCall().returns(stopper_func);

      sqs_processor.startProcessingQueue();
      sqs_processor.startProcessingQueue();
      sqs_processor.stopAfterCurrentBatch();
      message_capture_mock.receiveMessageBatch.should.have.callCount(1);
      sqs_timeout_handler_mock.start.should.have.callCount(1);
    });

    it('should force a new batch if the current batch timeout', done => {
      const stopper_func0 = sinon.stub();
      const stopper_func1 = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func)
          .onFirstCall().returns(stopper_func0)
          .onSecondCall().returns(stopper_func1);

      message_capture_mock.receiveMessageBatch = sinon.stub();

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      setImmediate(() => {
        // call the timeout callback instead of the message_capture timeout
        sqs_timeout_handler_mock.start.callArgWith(0, null);
        stopper_func0.should.have.callCount(0);

        setTimeout(() => {
          // stop should not have been called sine the timeout have cleared it
          stopper_func1.should.have.callCount(0);

          // the callback should have triggered a new receiveMessageBatch
          message_capture_mock.receiveMessageBatch.should.have.callCount(2);
          sqs_timeout_handler_mock.start.should.have.callCount(2);

          done();
        }, 1010);
      });
    });

    it('should NOT force a new batch if timeout handler throws exception', done => {
      const stopper_func0 = sinon.stub();
      const stopper_func1 = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func)
          .onFirstCall().returns(stopper_func0)
          .onSecondCall().returns(stopper_func1);

      message_capture_mock.receiveMessageBatch = sinon.stub();

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      process.nextTick(() => {

        // call the timeout callback instead of the message_capture timeout
        sqs_timeout_handler_mock.start.callArgWith(0, new Error('stop'));

        logger_mock.error.should.have.callCount(1);

        emitter_mock.emit.should.have.callCount(1);
        emitter_mock.emit.should.be.calledWithExactly('error', sinon.match.instanceOf(Error).and(sinon.match.has('message', 'stop')));

        // stop should not have been called sine the timeout have cleared it
        stopper_func0.should.have.callCount(0);

        // the callback should have triggered a new receiveMessageBatch
        message_capture_mock.receiveMessageBatch.should.have.callCount(1);
        sqs_timeout_handler_mock.start.should.have.callCount(1);

        done();
      });
    });

    it('should not start a new batch if done case already started one when timing out', done => {
      const stopper_func0 = sinon.stub();
      const stopper_func1 = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();

      // both the ok case and the timeout case should callback
      // both these will call receiveMessageBatch after a tick
      //sqs_timeout_handler_mock.start.onFirstCall().callsArgWith(0, null);
      message_capture_mock.receiveMessageBatch.onFirstCall().callsArgWith(1, null);

      sqs_timeout_handler_mock.start.withArgs(sinon.match.func)
          .onFirstCall()
          .returns(stopper_func0)
          .callsArgWith(0, null)
          .onSecondCall().returns(stopper_func1);

      // start. This will call receiveMessageBatch once
      sqs_processor.startProcessingQueue();

      // wait more than backoff time
      setTimeout(() => {
        message_capture_mock.receiveMessageBatch.should.have.callCount(2);
        sqs_timeout_handler_mock.start.should.have.callCount(2);
        done();
      }, 1010);

    });


    it('should inform the owning instance that there has been a fatal error');

  });
});
