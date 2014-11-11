'use strict';

var chai = require('chai'),
    sinon = require('sinon');

var message_capture_module = require('../../lib/message-capture.js');

var should = chai.should();

chai.use(require('sinon-chai'));


describe('unit/message-capture-test.js', function() {
  var message_queue_mock,
      message_processing_mock,
      logger_mock,
      message_capture;

  beforeEach(function() {
    message_queue_mock = { receiveQueueMessages: sinon.stub() };
    message_processing_mock = { processMessages: sinon.stub() };
    logger_mock = { debug: sinon.stub(), info: sinon.stub(), warn: sinon.stub() };
    message_capture = message_capture_module.create(
        message_queue_mock,
        message_processing_mock,
        logger_mock);
  });

  describe('receiveMessageBatch', function() {

    it('should receive a message batch from specified queue', function(done) {
      var queue_name = 'test_queue_name_' + Date.now(),
          sqs_messages = ['test message'];

      message_queue_mock.receiveQueueMessages.callsArgWithAsync(1, null, sqs_messages);
      message_processing_mock.processMessages.callsArgWithAsync(2, null);

      message_capture.receiveMessageBatch(queue_name, function(err) {
        should.not.exist(err);

        logger_mock.debug.should.have.callCount(1);
        logger_mock.debug.should.have.been.calledWithExactly(
            'receiveMessageBatch for %s',
            queue_name);
        logger_mock.info.should.have.callCount(2);
        logger_mock.warn.should.have.callCount(0);
        message_queue_mock.receiveQueueMessages.should.have.callCount(1);
        message_queue_mock.receiveQueueMessages.should.have.been.calledWith(
            queue_name,
            sinon.match.func);
        message_processing_mock.processMessages.should.have.callCount(1);
        message_processing_mock.processMessages.should.have.been.calledWith(
            sqs_messages,
            queue_name,
            sinon.match.func);
        done();
      });
    });

    it('should not process an empty message batch', function(done) {
      var queue_name = 'test_queue_name_' + Date.now(),
          sqs_messages = []; // empty batch

      message_queue_mock.receiveQueueMessages.callsArgWithAsync(1, null, sqs_messages);
      message_processing_mock.processMessages.callsArgWithAsync(2, null);

      message_capture.receiveMessageBatch(queue_name, function(err) {
        should.not.exist(err);

        logger_mock.debug.should.have.callCount(1);
        logger_mock.info.should.have.callCount(1);
        logger_mock.debug.should.have.been.calledWithExactly(
            'receiveMessageBatch for %s',
            queue_name);
        logger_mock.warn.should.have.callCount(0);
        message_queue_mock.receiveQueueMessages.should.have.callCount(1);
        message_queue_mock.receiveQueueMessages.should.have.been.calledWith(
            queue_name,
            sinon.match.func);
        message_processing_mock.processMessages.should.have.callCount(0);
        done();
      });
    });

    it('should callback with err if unable to fetch messages', function(done) {
      var queue_name = 'test_queue_name_' + Date.now(),
          sqs_err = new Error('Mocked SQS err');

      message_queue_mock.receiveQueueMessages.callsArgWithAsync(1, sqs_err, null);
      message_processing_mock.processMessages.callsArgWithAsync(2, null);

      message_capture.receiveMessageBatch(queue_name, function(err) {
        should.exist(err);
        err.should.have.property('message', 'Mocked SQS err');

        logger_mock.debug.should.have.callCount(1);
        logger_mock.debug.should.have.been.calledWithExactly(
            'receiveMessageBatch for %s',
            queue_name);
        logger_mock.info.should.have.callCount(0);
        logger_mock.warn.should.have.callCount(1);
        logger_mock.warn.should.have.been.calledWithExactly(
            sqs_err,
            'Error receiving messages for queue %s:',
            queue_name);
        message_queue_mock.receiveQueueMessages.should.have.callCount(1);
        message_queue_mock.receiveQueueMessages.should.have.been.calledWith(
            queue_name,
            sinon.match.func);
        message_processing_mock.processMessages.should.have.callCount(0);
        done();
      });
    });

  });

});
