'use strict';

var chai = require('chai'),
    sinon = require('sinon');

var sqs_processor_module = require('../..'),
    test_util = require('../../test-util/test-util.js');

chai.should();
chai.use(require('sinon-chai'));


describe('acceptance/sqs-processor-test.js', function() {
  var aws_sqs_mock,
      iterator,
      logger_mock,
      sqs_processor;

  beforeEach(function() {
    aws_sqs_mock = {
      receiveMessage: sinon.stub(),
      getQueueUrl: sinon.stub(),
      deleteMessage: sinon.stub()
    };

    logger_mock = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      trace: sinon.stub(),
      fatal: sinon.stub(),
      debug: sinon.stub()
    };

    iterator = sinon.stub();

    sqs_processor = sqs_processor_module.internals.create(
        aws_sqs_mock,
        iterator,
        test_util.getTestConfig(),
        logger_mock);
  });

  describe('Happy', function() {

    it('should be happy', function(done) {
      var counter = 0;

      iterator.withArgs(sinon.match(function(value) {
        counter += 1;
        // Count number of messages and stop the recursive loop after 4
        if (counter === 4) {
          sqs_processor.stopAfterCurrentBatch();
        }
        return true;
      })).callsArgWithAsync(1, null);

      aws_sqs_mock.receiveMessage.
        throws('aws_sqs_mock.receiveMessage too many times').
        onCall(0).
          callsArgWithAsync(1, null, {
            Messages: [mockMessage(0), mockMessage(1), mockMessage(2)]
          }).
        onCall(1).
          callsArgWithAsync(1, null, {
            Messages: []
          }).
        onCall(2).
          callsArgWithAsync(1, null, {
            Messages: [mockMessage(3)]
          });

      aws_sqs_mock.getQueueUrl.callsArgWithAsync(1, null, 'mocked queue url');
      aws_sqs_mock.deleteMessage.callsArgWithAsync(1, null, { mocked_resp_data: 1 });

      sqs_processor.startProcessingQueue();

      setTimeout(function() {
        iterator.should.have.callCount(4);

        [0, 1, 2, 3].forEach(function(i) {
          iterator.getCall(i).args[0].should.eql(mockMessage(i));
        });

        aws_sqs_mock.receiveMessage.should.have.callCount(3);
        aws_sqs_mock.deleteMessage.should.have.callCount(4);

        done();
      }, 100);
    });

    it('should create the module with an AWS instance', function() {
      var fn = sinon.stub();

      fn.throws(new Error('should not call'));

      sqs_processor_module.create(
        fn,
        test_util.getTestConfig(),
        logger_mock);
    });

  });

  describe('Sad', function() {

    it('should be sad');

  });

});


function mockMessage(id) {
  return {
    MessageId: id,
    ReceiptHandle: 'ReceiptHandle ' + id,
    Body: JSON.stringify({ mock_data: 'body of message ' + id })
  };
}
