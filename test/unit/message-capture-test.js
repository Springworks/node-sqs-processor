'use strict';

const message_capture_module = require('../../lib/message-capture');

describe('test/unit/message-capture-test.js', () => {
  let message_queue_mock;
  let message_processing_mock;
  let logger_mock;
  let message_capture;

  beforeEach(() => {
    message_queue_mock = { receiveQueueMessages: sinon.stub() };
    message_processing_mock = { processMessages: sinon.stub() };
    logger_mock = { trace: sinon.stub(), debug: sinon.stub(), info: sinon.stub(), warn: sinon.stub() };
    message_capture = message_capture_module.create(
        message_queue_mock,
        message_processing_mock,
        logger_mock);
  });

  describe('receiveMessageBatch', () => {

    it('should receive a message batch from specified queue', done => {
      const queue_name = 'test_queue_name_' + Date.now();
      const sqs_messages = ['test message'];

      message_queue_mock.receiveQueueMessages.callsArgWithAsync(1, null, sqs_messages);
      message_processing_mock.processMessages.callsArgWithAsync(2, null);

      message_capture.receiveMessageBatch(queue_name, err => {
        should.not.exist(err);

        logger_mock.debug.should.have.callCount(0);
        logger_mock.info.should.have.callCount(2);
        logger_mock.warn.should.have.callCount(0);
        message_queue_mock.receiveQueueMessages.should.have.callCount(1);
        message_queue_mock.receiveQueueMessages.should.be.calledWith(
            queue_name,
            sinon.match.func);
        message_processing_mock.processMessages.should.have.callCount(1);
        message_processing_mock.processMessages.should.be.calledWith(
            sqs_messages,
            queue_name,
            sinon.match.func);
        done();
      });
    });

    it('should not process an empty message batch', done => {
      const queue_name = 'test_queue_name_' + Date.now();
      const sqs_messages = [];
      // empty batch

      message_queue_mock.receiveQueueMessages.callsArgWithAsync(1, null, sqs_messages);
      message_processing_mock.processMessages.callsArgWithAsync(2, null);

      message_capture.receiveMessageBatch(queue_name, err => {
        should.not.exist(err);

        logger_mock.debug.should.have.callCount(0);
        logger_mock.info.should.have.callCount(0);
        logger_mock.warn.should.have.callCount(0);
        message_queue_mock.receiveQueueMessages.should.have.callCount(1);
        message_queue_mock.receiveQueueMessages.should.be.calledWith(
            queue_name,
            sinon.match.func);
        message_processing_mock.processMessages.should.have.callCount(0);
        done();
      });
    });

    it('should callback with err if unable to fetch messages', done => {
      const queue_name = 'test_queue_name_' + Date.now();
      const sqs_err = new Error('Mocked SQS err');

      message_queue_mock.receiveQueueMessages.callsArgWithAsync(1, sqs_err, null);
      message_processing_mock.processMessages.callsArgWithAsync(2, null);

      message_capture.receiveMessageBatch(queue_name, err => {
        should.exist(err);
        err.should.have.property('message', 'Mocked SQS err');

        logger_mock.debug.should.have.callCount(0);
        logger_mock.info.should.have.callCount(0);
        logger_mock.warn.should.have.callCount(0);
        logger_mock.trace.should.have.callCount(1);
        message_queue_mock.receiveQueueMessages.should.have.callCount(1);
        message_queue_mock.receiveQueueMessages.should.be.calledWith(
            queue_name,
            sinon.match.func);
        message_processing_mock.processMessages.should.have.callCount(0);
        done();
      });
    });

  });

});
