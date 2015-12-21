'use strict';

const message_queue_module = require('../../../lib/queue/message-queue');

describe('test/unit/queue/message-queue-test.js', function() {
  let sqs_handler_mock;
  let logger_mock;
  let message_queue;

  beforeEach(function() {
    sqs_handler_mock = {
      getQueueUrlParams: sinon.stub(),
      getQueueUrl: sinon.stub(),
    };
    logger_mock = {
      warn: sinon.stub(),
    };
    message_queue = message_queue_module.create(sqs_handler_mock, logger_mock);
  });

  describe('receiveQueueMessages', function() {

    beforeEach(function() {
      sqs_handler_mock.receiveMessageBatch = sinon.stub();
      logger_mock.debug = sinon.stub();
    });

    it('should receive queue messages', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const queue_url_params = { QueueName: queue_name };
      const queue_url = 'mocked-queue-url-for-' + queue_name;
      const mocked_messages = ['mocked message'];
      const sqs_data = { Messages: mocked_messages };

      sqs_handler_mock.getQueueUrlParams.throws('getQueueUrlParams not mocked for specified args')
          .withArgs(queue_name).returns(queue_url_params);

      sqs_handler_mock.getQueueUrl.throws('getQueueUrl not mocked for specified args')
          .withArgs(queue_url_params, sinon.match.func).callsArgWithAsync(1, null, queue_url);

      sqs_handler_mock.receiveMessageBatch.throws('receiveMessageBatch not mocked for specified args')
          .withArgs(queue_url, sinon.match.func).callsArgWithAsync(1, null, sqs_data);

      message_queue.receiveQueueMessages(queue_name, function(err, messages) {
        should.not.exist(err);
        messages.should.eql(mocked_messages);

        logger_mock.debug.should.have.callCount(0);
        sqs_handler_mock.getQueueUrlParams.should.have.callCount(1);
        sqs_handler_mock.getQueueUrlParams.should.be.calledWithExactly(queue_name);
        sqs_handler_mock.getQueueUrl.should.have.callCount(1);
        sqs_handler_mock.getQueueUrl.should.be.calledWithExactly(queue_url_params, sinon.match.func);
        sqs_handler_mock.receiveMessageBatch.should.have.callCount(1);
        sqs_handler_mock.receiveMessageBatch.should.be.calledWithExactly(queue_url, sinon.match.func);

        done();
      });
    });

    it('should callback with err if unable to get queue url', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const queue_url_params = { QueueName: queue_name };

      sqs_handler_mock.getQueueUrlParams.throws('getQueueUrlParams not mocked for specified args')
          .withArgs(queue_name).returns(queue_url_params);

      sqs_handler_mock.getQueueUrl.throws('getQueueUrl not mocked for specified args')
          .withArgs(queue_url_params, sinon.match.func).callsArgWithAsync(1, new Error('mock err from getQueueUrl'), null);

      message_queue.receiveQueueMessages(queue_name, function(err, messages) {
        should.exist(err);
        should.not.exist(messages);
        err.should.have.property('message', 'mock err from getQueueUrl');

        logger_mock.warn.should.have.callCount(1);
        logger_mock.warn.should.be.calledWithExactly(err, 'Error loading url for queue %s:', queue_name);
        sqs_handler_mock.getQueueUrl.should.have.callCount(1);
        sqs_handler_mock.getQueueUrl.should.be.calledWithExactly(queue_url_params, sinon.match.func);
        sqs_handler_mock.receiveMessageBatch.should.have.callCount(0);

        done();
      });
    });

    it('should callback with err if unable receive message batch', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const queue_url_params = { QueueName: queue_name };
      const queue_url = 'mocked-queue-url-for-' + queue_name;

      sqs_handler_mock.getQueueUrlParams.throws('getQueueUrlParams not mocked for specified args')
          .withArgs(queue_name).returns(queue_url_params);

      sqs_handler_mock.getQueueUrl.throws('getQueueUrl not mocked for specified args')
          .withArgs(queue_url_params, sinon.match.func).callsArgWithAsync(1, null, queue_url);

      sqs_handler_mock.receiveMessageBatch.throws('receiveMessageBatch not mocked for specified args')
          .withArgs(queue_url, sinon.match.func).callsArgWithAsync(1, new Error('mock err from receiveMessageBatch'), null);

      message_queue.receiveQueueMessages(queue_name, function(err, messages) {
        should.exist(err);
        should.not.exist(messages);
        err.should.have.property('message', 'mock err from receiveMessageBatch');

        logger_mock.warn.should.have.callCount(1);
        logger_mock.warn.should.be.calledWithExactly(err, 'Error receiving messages from %s:', queue_url);
        sqs_handler_mock.getQueueUrl.should.have.callCount(1);
        sqs_handler_mock.getQueueUrl.should.be.calledWithExactly(queue_url_params, sinon.match.func);
        sqs_handler_mock.receiveMessageBatch.should.have.callCount(1);

        done();
      });
    });

    it('should callback with err if response object is undefined', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const queue_url_params = { QueueName: queue_name };
      const queue_url = 'mocked-queue-url-for-' + queue_name;
      const sqs_data = null;

      sqs_handler_mock.getQueueUrlParams.returns(queue_url_params);
      sqs_handler_mock.getQueueUrl.callsArgWithAsync(1, null, queue_url);
      sqs_handler_mock.receiveMessageBatch.callsArgWithAsync(1, null, sqs_data);

      message_queue.receiveQueueMessages(queue_name, function(err, messages) {
        should.exist(err);
        should.not.exist(messages);
        err.should.have.property('message', 'Invalid SQS response');
        done();
      });
    });

    it('should callback with an empty array if response does not contain messages', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const queue_url_params = { QueueName: queue_name };
      const queue_url = 'mocked-queue-url-for-' + queue_name;
      const sqs_data = { Messages: null };

      sqs_handler_mock.getQueueUrlParams.returns(queue_url_params);
      sqs_handler_mock.getQueueUrl.callsArgWithAsync(1, null, queue_url);
      sqs_handler_mock.receiveMessageBatch.callsArgWithAsync(1, null, sqs_data);

      message_queue.receiveQueueMessages(queue_name, function(err, messages) {
        should.not.exist(err);
        should.exist(messages);
        messages.should.be.an.instanceof(Array);
        messages.should.have.length(0);
        done();
      });
    });

  });

  describe('deleteMessage', function() {

    beforeEach(function() {
      sqs_handler_mock.deleteMessage = sinon.stub();
    });

    it('should delete a message', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const receipt_handle = 'test_receipt_handle_' + Date.now();
      const queue_url_params = { QueueName: queue_name };
      const queue_url = 'mocked-queue-url-for-' + queue_name;

      sqs_handler_mock.getQueueUrlParams.throws('getQueueUrlParams not mocked for specified args')
          .withArgs(queue_name).returns(queue_url_params);

      sqs_handler_mock.getQueueUrl.throws('getQueueUrl not mocked for specified args')
          .withArgs(queue_url_params, sinon.match.func).callsArgWithAsync(1, null, queue_url);

      sqs_handler_mock.deleteMessage.throws('deleteMessage not mocked for specified args')
          .withArgs(queue_url, receipt_handle, sinon.match.func).callsArgWithAsync(2, null);

      message_queue.deleteMessage(queue_name, receipt_handle, function(err) {
        should.not.exist(err);

        sqs_handler_mock.getQueueUrlParams.should.have.callCount(1);
        sqs_handler_mock.getQueueUrlParams.should.be.calledWithExactly(queue_name);
        sqs_handler_mock.getQueueUrl.should.have.callCount(1);
        sqs_handler_mock.getQueueUrl.should.be.calledWithExactly(queue_url_params, sinon.match.func);
        sqs_handler_mock.deleteMessage.should.have.callCount(1);
        sqs_handler_mock.deleteMessage.should.be.calledWithExactly(queue_url, receipt_handle, sinon.match.func);

        done();
      });
    });

    it('should callback with err if unable to get queue url', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const receipt_handle = 'test_receipt_handle_' + Date.now();

      sqs_handler_mock.getQueueUrlParams.returns({ QueueName: queue_name });

      sqs_handler_mock.getQueueUrl.callsArgWithAsync(1, new Error('mock err from getQueueUrl'), null);

      message_queue.deleteMessage(queue_name, receipt_handle, function(err) {
        should.exist(err);
        err.should.have.property('message', 'mock err from getQueueUrl');

        sqs_handler_mock.getQueueUrlParams.should.have.callCount(1);
        sqs_handler_mock.getQueueUrl.should.have.callCount(1);
        sqs_handler_mock.deleteMessage.should.have.callCount(0);

        done();
      });
    });

    it('should callback with err if delete fails', function(done) {
      const queue_name = 'test_queue_name_' + Date.now();
      const receipt_handle = 'test_receipt_handle_' + Date.now();
      const queue_url_params = { QueueName: queue_name };
      const queue_url = 'mocked-queue-url-for-' + queue_name;

      sqs_handler_mock.getQueueUrlParams.throws('getQueueUrlParams not mocked for specified args')
          .withArgs(queue_name).returns(queue_url_params);

      sqs_handler_mock.getQueueUrl.throws('getQueueUrl not mocked for specified args')
          .withArgs(queue_url_params, sinon.match.func).callsArgWithAsync(1, null, queue_url);

      sqs_handler_mock.deleteMessage.throws('deleteMessage not mocked for specified args')
          .withArgs(queue_url, receipt_handle, sinon.match.func).callsArgWithAsync(2, new Error('mock err from deleteMessage'));

      message_queue.deleteMessage(queue_name, receipt_handle, function(err) {
        should.exist(err);
        err.should.have.property('message', 'mock err from deleteMessage');

        sqs_handler_mock.getQueueUrlParams.should.have.callCount(1);
        sqs_handler_mock.getQueueUrlParams.should.be.calledWithExactly(queue_name);
        sqs_handler_mock.getQueueUrl.should.have.callCount(1);
        sqs_handler_mock.getQueueUrl.should.be.calledWithExactly(queue_url_params, sinon.match.func);
        sqs_handler_mock.deleteMessage.should.have.callCount(1);
        sqs_handler_mock.deleteMessage.should.be.calledWithExactly(queue_url, receipt_handle, sinon.match.func);

        done();
      });
    });

  });

});
