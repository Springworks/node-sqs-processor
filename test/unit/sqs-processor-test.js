'use strict';

var sqs_processor_module = require('../../lib/sqs-processor.js');
var test_util = require('../../test-util/test-util.js');

describe(__filename, function() {
  var sqs_processor,
      message_capture_mock,
      logger_mock,
      sqs_timeout_handler_mock,
      emitter_mock;

  beforeEach(function() {
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
      emit: sinon.stub()
    };

    sqs_processor = sqs_processor_module.create(message_capture_mock,
        sqs_timeout_handler_mock,
        emitter_mock,
        test_util.getTestConfig(),
        logger_mock);
  });

  describe('starting', function() {

    it('should receive the next message batch directly when it is started', function(done) {
      var stopper_func = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();
      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).returns(stopper_func);

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);
      sqs_timeout_handler_mock.start.should.be.calledWith(sinon.match.func);

      process.nextTick(function() {
        message_capture_mock.receiveMessageBatch.callArgWith(1, null);
        stopper_func.should.be.calledWith();
        done();
      });

    });


    it('should warn if no messages can be fetched', function(done) {
      var stopper_func = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).returns(stopper_func);

      // call to start chain
      sqs_processor.startProcessingQueue();
      sqs_processor.stopAfterCurrentBatch();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      process.nextTick(function() {
        message_capture_mock.receiveMessageBatch.callArgWith(1, new Error('smackzors'));
        logger_mock.warn.should.be.calledWith(new Error('smackzors'), 'An error occurred during message capturing');
        done();
      });

    });

    it('should fetch a new message batch when done with current batch', function(done) {
      var stopper_func0 = sinon.stub(),
          stopper_func1 = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onFirstCall().returns(stopper_func0);
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onSecondCall().returns(stopper_func1);

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      process.nextTick(function() {
        message_capture_mock.receiveMessageBatch.callArgWith(1, null);
        stopper_func0.should.be.calledWith();
        process.nextTick(function() {
          message_capture_mock.receiveMessageBatch.should.have.callCount(2);
          sqs_processor.stopAfterCurrentBatch();
          done();
        });
      });

    });

    it('should fetch a new message batch when done' +
       'with current batch even if there is an error', function(done) {
      var stopper_func0 = sinon.stub();
      var stopper_func1 = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onFirstCall().returns(stopper_func0);
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onSecondCall().returns(stopper_func1);

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      process.nextTick(function() {
        message_capture_mock.receiveMessageBatch.callArgWith(1, new Error('message'));
        stopper_func0.should.be.calledWith();

        process.nextTick(function() {
          message_capture_mock.receiveMessageBatch.should.have.callCount(2);
          done();
        });

      });

    });

    it('should ignore a second call to startProcessingQueue', function() {
      var stopper_func = sinon.stub();
      message_capture_mock.receiveMessageBatch = sinon.stub();
      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func).onFirstCall().returns(stopper_func);

      sqs_processor.startProcessingQueue();
      sqs_processor.startProcessingQueue();
      sqs_processor.stopAfterCurrentBatch();
      message_capture_mock.receiveMessageBatch.should.have.callCount(1);
      sqs_timeout_handler_mock.start.should.have.callCount(1);
    });

    it('should force a new batch if the current batch timesout', function(done) {

      var stopper_func0 = sinon.stub(),
          stopper_func1 = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func)
          .onFirstCall().returns(stopper_func0)
          .onSecondCall().returns(stopper_func1);

      message_capture_mock.receiveMessageBatch = sinon.stub();

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      process.nextTick(function() {
        // call the timeout callback instead of the message_capture timeout
        sqs_timeout_handler_mock.start.callArgWith(0, null);
        stopper_func0.should.have.callCount(0);

        process.nextTick(function() {
          // stop should not have been called sine the timeout have cleared it
          stopper_func1.should.have.callCount(0);

          // the callback should have triggered a new receiveMessageBatch
          message_capture_mock.receiveMessageBatch.should.have.callCount(2);
          sqs_timeout_handler_mock.start.should.have.callCount(2);

          done();
        });
      });
    });

    it('should NOT force a new batch if timeout handler throws exception', function(done) {

      var stopper_func0 = sinon.stub(),
          stopper_func1 = sinon.stub();

      sqs_timeout_handler_mock.start = sinon.stub();
      sqs_timeout_handler_mock.start.withArgs(sinon.match.func)
          .onFirstCall().returns(stopper_func0)
          .onSecondCall().returns(stopper_func1);

      message_capture_mock.receiveMessageBatch = sinon.stub();

      // call to start chain
      sqs_processor.startProcessingQueue();

      // make sure message capture was called
      message_capture_mock.receiveMessageBatch.should.be.calledWith('test_queue_name', sinon.match.func);

      process.nextTick(function() {

        // call the timeout callback instead of the message_capture timeout
        sqs_timeout_handler_mock.start.callArgWith(0, new Error('stop'));

        logger_mock.error.should.have.callCount(1);
        logger_mock.error.should.be.calledWithExactly(sinon.match.instanceOf(Error).and(sinon.match.has('message', 'stop')));

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

    it('should not start a new batch if done case already started one when timing out', function(done) {
      var stopper_func0 = sinon.stub();
      var stopper_func1 = sinon.stub();

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

      //wait two ticks
      process.nextTick(function() {
        process.nextTick(function() {
          message_capture_mock.receiveMessageBatch.should.have.callCount(2);
          sqs_timeout_handler_mock.start.should.have.callCount(2);
          done();
        });
      });
    });



    it('should inform the owning instance that there has been a fatal error');

  });

});
