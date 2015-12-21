'use strict';

const sqs_processor_module = require('../..');
const test_util = require('../../test-util/test-util');

describe('test/acceptance/sqs-processor-test.js', () => {
  let aws_sqs_mock;
  let iterator;
  let logger_mock;
  let sqs_processor;

  beforeEach(() => {
    aws_sqs_mock = {
      receiveMessage: sinon.stub(),
      getQueueUrl: sinon.stub(),
      deleteMessage: sinon.stub(),
    };

    logger_mock = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      trace: sinon.stub(),
      fatal: sinon.stub(),
      debug: sinon.stub(),
    };

    iterator = sinon.stub();

    sqs_processor = sqs_processor_module.internals.create(
        aws_sqs_mock,
        iterator,
        test_util.getTestConfig(),
        logger_mock);
  });

  describe('Happy', () => {

    it('should be happy', done => {
      let counter = 0;

      iterator.withArgs(sinon.match(value => {
        counter += 1;
        // Count number of messages and stop the recursive loop after 4
        if (counter === 4) {
          sqs_processor.stopAfterCurrentBatch();
        }
        return true;
      })).callsArgWithAsync(1, null);

      aws_sqs_mock.receiveMessage.throws('aws_sqs_mock.receiveMessage too many times')
          .onCall(0).callsArgWithAsync(1, null, {
            Messages: [mockMessage(0), mockMessage(1), mockMessage(2)],
          })
          .onCall(1).callsArgWithAsync(1, null, {
            Messages: [],
          })
          .onCall(2).callsArgWithAsync(1, null, {
            Messages: [mockMessage(3)],
          });

      aws_sqs_mock.getQueueUrl.callsArgWithAsync(1, null, 'mocked queue url');
      aws_sqs_mock.deleteMessage.callsArgWithAsync(1, null, { mocked_resp_data: 1 });

      sqs_processor.startProcessingQueue();

      setTimeout(() => {
        iterator.should.have.callCount(4);

        [0, 1, 2, 3].forEach(i => {
          iterator.getCall(i).args[0].should.eql(mockMessage(i));
        });

        aws_sqs_mock.receiveMessage.should.have.callCount(3);
        aws_sqs_mock.deleteMessage.should.have.callCount(4);

        done();
      }, 100);
    });

    it('should create the module with an AWS instance', () => {
      const fn = sinon.stub();
      fn.throws(new Error('should not call'));
      sqs_processor_module.create(fn, test_util.getTestConfig(), logger_mock);
    });

  });

  describe('Sad', () => {

    it('should be sad');

  });
});


function mockMessage(id) {
  return {
    MessageId: id,
    ReceiptHandle: 'ReceiptHandle ' + id,
    Body: JSON.stringify({ mock_data: 'body of message ' + id }),
  };
}
