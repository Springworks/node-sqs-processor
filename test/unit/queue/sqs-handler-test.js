'use strict';

const sqs_handler_module = require('../../../lib/queue/sqs-handler');
const test_util = require('../../../test-util/test-util');

describe('test/unit/queue/sqs-handler-test.js', () => {
  let sqs_handler;
  let aws_sqs;
  let logger;
  let config;

  beforeEach(() => {
    aws_sqs = {};
    logger = {};
    config = test_util.getTestConfig();
  });

  describe('Getting SQS queue URL', () => {

    it('should provide params required to find URL by name', done => {
      const params = { someparam: 'mockedparam' };
      const mockdata = { QueueUrl: 'https://www.mock.com' };

      aws_sqs.getQueueUrl = sinon.stub();
      aws_sqs.getQueueUrl.throws('not mocked args')
          .withArgs(sinon.match.object, sinon.match.func).callsArgWithAsync(1, null, mockdata);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.getQueueUrl(params, (err, url) => {
        should.not.exist(err);
        url.should.eql('https://www.mock.com');
        done();
      });

    });

    it('should callback with error when error', done => {
      const params = { someparam: 'mockedparam' };

      aws_sqs.getQueueUrl = sinon.stub();
      aws_sqs.getQueueUrl.throws('not mocked args')
          .withArgs(sinon.match.object, sinon.match.func).callsArgWithAsync(1, new Error(), null);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.getQueueUrl(params, (err, url) => {
        should.exist(err);
        should.not.exist(url);
        done();
      });

    });

  });

  describe('Receiving Message Batch', () => {

    it('should receive message batch', done => {
      const url = 'queue_url';
      let expected_params;

      expected_params = {
        QueueUrl: 'http://www.mock.com',
        VisibilityTimeout: 5,
        WaitTimeSeconds: 5,
        AttributeNames: ['All'],
        MaxNumberOfMessages: 10,
      };

      logger.debug = sinon.stub().throws('debug not mocked for args')
          .withArgs('receiveMessageBatch: %s', url).returns();

      aws_sqs.receiveMessage = sinon.stub().throws('aws_sqs not mocked for args')
          .withArgs(expected_params, sinon.match.func).callsArgWithAsync(1, null, { Message: 'abc123' });

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.receiveMessageBatch(url, (err, data) => {
        should.not.exist(err);
        data.should.eql({ Message: 'abc123' });
        done();
      });

    });

    it('should handle error from aws_sqs', done => {
      const url = 'queue_url';
      let expected_params;

      expected_params = {
        QueueUrl: 'http://www.mock.com',
        VisibilityTimeout: 5,
        WaitTimeSeconds: 5,
        AttributeNames: ['All'],
        MaxNumberOfMessages: 10,
      };

      logger.debug = sinon.stub().throws('debug not mocked for args')
          .withArgs('receiveMessageBatch: %s', url).returns();

      aws_sqs.receiveMessage = sinon.stub().throws('aws_sqs not mocked for args')
          .withArgs(expected_params, sinon.match.func).callsArgWithAsync(1, new Error('banana'), null);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.receiveMessageBatch(url, (err, data) => {
        should.not.exist(data);
        err.should.be.instanceOf(Error);
        done();
      });

    });

  });

  describe('Getting queue url params', () => {

    it('should get the queue url params', () => {
      let result;
      const url = 'sqs_url';

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);
      result = sqs_handler.getQueueUrlParams(url);
      result.should.have.ownProperty('QueueName');
      result.QueueName.should.equal('sqs_url');
    });

  });

  describe('Getting receive message params', () => {

    it('should get the receive message params', () => {
      let result;
      const url = 'sqs_url';
      const expected_params = {
        QueueUrl: url,
        VisibilityTimeout: 5,
        WaitTimeSeconds: 5,
        AttributeNames: ['All'],
        MaxNumberOfMessages: 10,
      };

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);
      result = sqs_handler.getReceiveMessageParams(url);
      result.should.eql(expected_params);
    });

  });

  describe('Deleting messages', () => {

    it('should delete messages', done => {
      const queue_url = 'sqs_url';
      const receipt_handle = 'receipt_handle';

      aws_sqs.deleteMessage = sinon.stub().throws('aws_sqs not mocked for args')
          .withArgs({ QueueUrl: queue_url, ReceiptHandle: receipt_handle }, sinon.match.func)
          .callsArgWithAsync(1, null, { emty: 'data' });

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.deleteMessage(queue_url, receipt_handle, (err, data) => {
        should.not.exist(err);
        should.not.exist(data); // data is also supposed to be null
        done();
      });
    });

    it('should handle error', done => {
      const queue_url = 'sqs_url';
      const receipt_handle = 'receipt_handle';

      aws_sqs.deleteMessage = sinon.stub().throws('aws_sqs not mocked for args')
          .withArgs({ QueueUrl: queue_url, ReceiptHandle: receipt_handle }, sinon.match.func)
          .callsArgWithAsync(1, new Error('crash'), null);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.deleteMessage(queue_url, receipt_handle, (err, data) => {
        err.should.be.instanceOf(Error);
        should.not.exist(data); // data is also supposed to be null
        done();
      });
    });

  });

});
