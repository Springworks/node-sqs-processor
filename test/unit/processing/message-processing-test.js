'use strict';

var chai = require('chai'),
    sinon = require('sinon');

var message_processing_module = require('../../../lib/processing/message-processing.js');

chai.should();
chai.use(require('sinon-chai'));


describe('unit/processing/message-processing-test.js', function() {
  var message_queue_mock,
      logger_mock,
      providedMessageProcessor,
      message_processing;

  beforeEach(function() {
    message_queue_mock = {
      deleteMessage: sinon.stub()
    };
    logger_mock = {
      trace: sinon.stub(),
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub()
    };
    providedMessageProcessor = sinon.stub();
    message_processing = message_processing_module.create(
        providedMessageProcessor,
        message_queue_mock,
        logger_mock);
  });

  describe('processMessages', function() {

    it('should process a batch of messages', function(done) {
      var sqs_messages = [getMockedMessage(), getMockedMessage()],
          queue_name = 'queue_name ' + randomString();

      providedMessageProcessor.callsArgWithAsync(1, null);
      message_queue_mock.deleteMessage.callsArgWithAsync(2, null);

      message_processing.processMessages(sqs_messages, queue_name, function() {
        logger_mock.info.should.have.callCount(2);
        providedMessageProcessor.should.have.callCount(sqs_messages.length);
        message_queue_mock.deleteMessage.should.have.callCount(sqs_messages.length);
        done();
      });
    });

    it('should only delete successfully processed messages', function(done) {
      var queue_name = 'queue_name ' + randomString(),
          sqs_messages = [
            getMockedMessage(),
            getMockedMessage(),
            getMockedMessage(),
            getMockedMessage()
          ];

      // Setup message processor to fail on the second message and throw on the third but
      // succeed on the first and fourth message.
      providedMessageProcessor.
          onCall(0).
            callsArgWithAsync(1, null).
          onCall(1).
            callsArgWithAsync(1, new Error('Mock error from second message')).
          onCall(2).
            throws('Mock error from third message').
          onCall(3).
            callsArgWithAsync(1, null);

      message_queue_mock.deleteMessage.callsArgWithAsync(2, null);

      message_processing.processMessages(sqs_messages, queue_name, function() {
        // Two warnings was logged for the two failed messages
        logger_mock.warn.should.have.callCount(2);

        providedMessageProcessor.should.have.callCount(sqs_messages.length);

        // Check that only 2 messeges was deleted
        message_queue_mock.deleteMessage.should.have.callCount(sqs_messages.length - 2);

        done();
      });
    });

  });

  describe('processMessage', function() {

    it('should process a single message', function(done) {
      var queue_name = 'queue_name ' + randomString(),
          sqs_message = getMockedMessage();

      providedMessageProcessor.callsArgWithAsync(1, null);
      message_queue_mock.deleteMessage.callsArgWithAsync(2, null);

      message_processing.processMessage(queue_name, sqs_message, function() {
        providedMessageProcessor.should.have.callCount(1);
        message_queue_mock.deleteMessage.should.have.callCount(1);
        done();
      });
    });

  });

  describe('handleProcessedMessage', function() {
    var queue_name = 'queue_name ' + randomString(),
        sqs_message = getMockedMessage();

    describe('with valid input and processed message', function() {

      it('should delete the processed message', function(done) {

        message_queue_mock.deleteMessage.callsArgWithAsync(2, null);

        message_processing.handleProcessedMessage(
            null,
            queue_name,
            sqs_message,
            function(err) {
              logger_mock.trace.should.have.callCount(0);
              logger_mock.warn.should.have.callCount(0);
              message_queue_mock.deleteMessage.should.have.callCount(1);
              done(err);
            });
      });

    });

    describe('with error from processMessage()', function() {

      it('should callback immediately without passing err', function(done) {
        message_processing.handleProcessedMessage(
            new Error('Error from processMessage'),
            queue_name,
            sqs_message,
            function(err) {
              logger_mock.trace.should.have.callCount(0);
              logger_mock.warn.should.have.callCount(1);
              message_queue_mock.deleteMessage.should.have.callCount(0);
              done(err);
            });
      });

    });

    describe('with failing deleteMessage()', function() {

      it('should callback with err', function(done) {
        message_queue_mock.deleteMessage.
            callsArgWithAsync(2, new Error('Mock err from deleteMessage'));

        message_processing.handleProcessedMessage(
            null,
            queue_name,
            sqs_message,
            function(err) {
              logger_mock.trace.should.have.callCount(0);
              logger_mock.warn.should.have.callCount(1);
              logger_mock.warn.should.have.been.calledWithExactly(
                  sinon.match.object,
                  'Error deleting message');
              message_queue_mock.deleteMessage.should.have.callCount(1);
              done(err);
            });
      });

    });

    describe('with invalid ReceiptHandle', function() {

      it('should invoke callback and not delete message', function(done) {
        message_queue_mock.deleteMessage.callsArgWithAsync(2, null);
        var invalid_sqs_message_param = {};
        message_processing.handleProcessedMessage(
            null,
            queue_name,
            invalid_sqs_message_param,
            function(err) {
              logger_mock.warn.should.have.callCount(1);
              message_queue_mock.deleteMessage.should.have.callCount(0);
              done(err);
            });
      });

    });

  });

});


function getMockedMessage() {
  var r = randomString();
  return {
    MessageId: 'MessageId ' + r,
    ReceiptHandle: 'ReceiptHandle ' + r,
    Attributes: {
      ApproximateReceiveCount: 0,
      SentTimestamp: Date.now(),
      ApproximateFirstReceiveTimestamp: undefined
    },
    Body: '{}'
  };
}


function randomString() {
  return Math.random().toString(35).substr(-15);
}
