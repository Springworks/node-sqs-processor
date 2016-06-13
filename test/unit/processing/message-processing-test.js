'use strict';

const message_processing_module = require('../../../lib/processing/message-processing');

describe('test/unit/processing/message-processing-test.js', () => {
  let message_queue_mock;
  let logger_mock;
  let providedMessageProcessor;
  let message_processing;

  beforeEach(() => {
    message_queue_mock = {
      deleteMessage: sinon.stub(),
    };
    logger_mock = {
      trace: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };
    providedMessageProcessor = sinon.stub();
    message_processing = message_processing_module.create(providedMessageProcessor, message_queue_mock, logger_mock);
  });

  describe('processMessages', () => {

    it('should process a batch of messages', done => {
      const sqs_messages = [getMockedMessage(), getMockedMessage()];
      const queue_name = 'queue_name ' + randomString();

      providedMessageProcessor.callsArgWithAsync(1, null);
      message_queue_mock.deleteMessage.callsArgWithAsync(2, null);

      message_processing.processMessages(sqs_messages, queue_name, () => {
        logger_mock.info.should.have.callCount(2);
        providedMessageProcessor.should.have.callCount(sqs_messages.length);
        message_queue_mock.deleteMessage.should.have.callCount(sqs_messages.length);
        done();
      });
    });

    it('should only delete successfully processed messages', done => {
      const queue_name = 'queue_name ' + randomString();
      const sqs_messages = [
        getMockedMessage(),
        getMockedMessage(),
        getMockedMessage(),
        getMockedMessage(),
      ];

      // Setup message processor to fail on the second message and throw on the third but
      // succeed on the first and fourth message.
      providedMessageProcessor
          .onCall(0).callsArgWithAsync(1, null)
          .onCall(1).callsArgWithAsync(1, new Error('Mock error from second message'))
          .onCall(2).throws('Mock error from third message')
          .onCall(3).callsArgWithAsync(1, null);

      message_queue_mock.deleteMessage.callsArgWithAsync(2, null);

      message_processing.processMessages(sqs_messages, queue_name, () => {
        providedMessageProcessor.should.have.callCount(sqs_messages.length);

        // Check that only 2 messeges was deleted
        message_queue_mock.deleteMessage.should.have.callCount(sqs_messages.length - 2);

        done();
      });
    });

  });

  describe('processMessage', () => {

    it('should process a single message', done => {
      const queue_name = 'queue_name ' + randomString();
      const sqs_message = getMockedMessage();

      providedMessageProcessor.callsArgWithAsync(1, null);
      message_queue_mock.deleteMessage.callsArgWithAsync(2, null);

      message_processing.processMessage(queue_name, sqs_message, () => {
        providedMessageProcessor.should.have.callCount(1);
        message_queue_mock.deleteMessage.should.have.callCount(1);
        done();
      });
    });

  });

  describe('handleProcessedMessage', () => {
    const queue_name = 'queue_name ' + randomString();
    const sqs_message = getMockedMessage();

    describe('with valid input and processed message', () => {

      it('should delete the processed message', done => {
        message_queue_mock.deleteMessage.callsArgWithAsync(2, null);
        message_processing.handleProcessedMessage(null, queue_name, sqs_message, err => {
          logger_mock.trace.should.have.callCount(0);
          logger_mock.warn.should.have.callCount(0);
          message_queue_mock.deleteMessage.should.have.callCount(1);
          done(err);
        });
      });

    });

    describe('with error from processMessage()', () => {

      it('should callback immediately without passing err', done => {
        message_processing.handleProcessedMessage(new Error('Error from processMessage'), queue_name, sqs_message, err => {
          logger_mock.trace.should.have.callCount(1);
          logger_mock.warn.should.have.callCount(0);
          message_queue_mock.deleteMessage.should.have.callCount(0);
          done(err);
        });
      });

    });

    describe('with failing deleteMessage()', () => {

      it('should callback with err', done => {
        message_queue_mock.deleteMessage.callsArgWithAsync(2, new Error('Mock err from deleteMessage'));

        message_processing.handleProcessedMessage(null, queue_name, sqs_message, err => {
          logger_mock.trace.should.have.callCount(0);
          logger_mock.warn.should.have.callCount(1);
          logger_mock.warn.should.be.calledWithExactly(sinon.match.object, 'Error deleting message');
          message_queue_mock.deleteMessage.should.have.callCount(1);
          done(err);
        });
      });

    });

    describe('with invalid ReceiptHandle', () => {

      it('should invoke callback and not delete message', done => {
        message_queue_mock.deleteMessage.callsArgWithAsync(2, null);
        const invalid_sqs_message_param = {};
        message_processing.handleProcessedMessage(null, queue_name, invalid_sqs_message_param, err => {
          logger_mock.warn.should.have.callCount(1);
          message_queue_mock.deleteMessage.should.have.callCount(0);
          done(err);
        });
      });

    });

  });

});


function getMockedMessage() {
  const r = randomString();
  return {
    MessageId: 'MessageId ' + r,
    ReceiptHandle: 'ReceiptHandle ' + r,
    Attributes: {
      ApproximateReceiveCount: 0,
      SentTimestamp: Date.now(),
      ApproximateFirstReceiveTimestamp: undefined,
    },
    Body: '{}',
  };
}


function randomString() {
  return Math.random().toString(35).substr(-15);
}
