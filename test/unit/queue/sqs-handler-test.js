'use strict';

var chai = require('chai'),
    sinon = require('sinon');

var sqs_handler_module = require('../../../lib/queue/sqs-handler.js'),
    test_util = require('../../../test-util/test-util.js');

var should = chai.should();

chai.use(require('sinon-chai'));


describe('unit/queue/sqs-handler-test.js', function() {
  var sqs_handler,
      aws_sqs,
      logger,
      config;

  beforeEach(function() {
    aws_sqs = {};
    logger = {};
    config = test_util.getTestConfig();
  });

  describe('Getting SQS queue URL', function() {

    it('should provide params required to find URL by name', function(done) {

      var params = { someparam: 'mockedparam' },
          mockdata = { QueueUrl: 'https://www.mock.com' };

      aws_sqs.getQueueUrl = sinon.stub();
      aws_sqs.getQueueUrl
              .throws('not mocked args')
              .withArgs(sinon.match.object, sinon.match.func)
              .callsArgWithAsync(1, null, mockdata);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.getQueueUrl(params, function(err, url) {
        should.not.exist(err);
        url.should.eql('https://www.mock.com');
        done();
      });

    });

    it('should callback with error when error', function(done) {
      var params = { someparam: 'mockedparam' };

      aws_sqs.getQueueUrl = sinon.stub();
      aws_sqs.getQueueUrl
              .throws('not mocked args')
              .withArgs(sinon.match.object, sinon.match.func)
              .callsArgWithAsync(1, new Error(), null);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.getQueueUrl(params, function(err, url) {
        should.exist(err);
        should.not.exist(url);
        done();
      });

    });
  });

  describe('Receiving Message Batch', function() {

    it('should receive message batch', function(done) {
      var url = 'queue_url',
          expected_params;

      expected_params = {
        QueueUrl: 'http://www.mock.com',
        VisibilityTimeout: 5,
        WaitTimeSeconds: 5,
        AttributeNames: ['All'],
        MaxNumberOfMessages: 10
      };

      logger.debug = sinon.stub()
            .throws('debug not mocked for args')
              .withArgs('receiveMessageBatch: %s', url)
              .returns();

      aws_sqs.receiveMessage = sinon.stub()
            .throws('aws_sqs not mocked for args')
              .withArgs(expected_params, sinon.match.func)
              .callsArgWithAsync(1, null, {Message: 'abc123'});

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.receiveMessageBatch(url, function(err, data) {
        should.not.exist(err);
        data.should.deep.equal({ Message: 'abc123' });
        done();
      });

    });

    it('should handle error from aws_sqs', function(done) {
      var url = 'queue_url',
          expected_params;

      expected_params = {
        QueueUrl: 'http://www.mock.com',
        VisibilityTimeout: 5,
        WaitTimeSeconds: 5,
        AttributeNames: ['All'],
        MaxNumberOfMessages: 10
      };

      logger.debug = sinon.stub()
            .throws('debug not mocked for args')
              .withArgs('receiveMessageBatch: %s', url)
              .returns();

      aws_sqs.receiveMessage = sinon.stub()
            .throws('aws_sqs not mocked for args')
              .withArgs(expected_params, sinon.match.func)
              .callsArgWithAsync(1, new Error('banana'), null);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.receiveMessageBatch(url, function(err, data) {
        should.not.exist(data);
        err.should.deep.instanceOf(Error);
        done();
      });

    });
  });

   describe('Getting queue url params', function() {
    it('should get the queue url params', function() {
      var result,
          url = 'sqs_url';

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);
      result = sqs_handler.getQueueUrlParams(url);
      result.should.have.ownProperty('QueueName');
      result.QueueName.should.equal('sqs_url');
    });
   });

   describe('Getting receive message params', function() {
    it('should get the receive message params', function() {
      var result,
          url = 'sqs_url',
          expected_params = {
            QueueUrl: url,
            VisibilityTimeout: 5,
            WaitTimeSeconds: 5,
            AttributeNames: ['All'],
            MaxNumberOfMessages: 10
          };

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      result = sqs_handler.getReceiveMessageParams(url);

      result.should.have.deep.equal(expected_params);
    });
  });

  describe('Deleting messages',function() {
    it('should delete messages', function(done) {

      var queue_url = 'sqs_url',
          receipt_handle = 'receipt_handle';

      aws_sqs.deleteMessage = sinon.stub()
              .throws('aws_sqs not mocked for args')
              .withArgs({
                QueueUrl: queue_url,
                ReceiptHandle: receipt_handle
              }, sinon.match.func)
              .callsArgWithAsync(1, null, {emty: 'data'});

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.deleteMessage(queue_url, receipt_handle, function(err, data) {
        should.not.exist(err);
        should.not.exist(data); // data is also supposed to be null
        done();
      });
    });

    it('should handle error', function(done) {

      var queue_url = 'sqs_url',
          receipt_handle = 'receipt_handle';

      aws_sqs.deleteMessage = sinon.stub()
              .throws('aws_sqs not mocked for args')
              .withArgs({
                QueueUrl: queue_url,
                ReceiptHandle: receipt_handle
              }, sinon.match.func)
              .callsArgWithAsync(1, new Error('crash'), null);

      sqs_handler = sqs_handler_module.create(aws_sqs, config, logger);

      sqs_handler.deleteMessage(queue_url, receipt_handle, function(err, data) {
        err.should.deep.instanceOf(Error);
        should.not.exist(data); // data is also supposed to be null
        done();
      });
    });


  });
});
