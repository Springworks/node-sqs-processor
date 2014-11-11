'use strict';

var chai = require('chai');

var logging_util = require('../../../lib/util/logging-util.js');

var formattedPayload = logging_util.formattedPayload,
    payloadForSQSMessage = logging_util.payloadForSQSMessage,
    payloadDate = logging_util.payloadDate;

chai.should();


describe('unit/util/logging-util-test.js', function() {

  describe('formattedPayload', function() {

    it('should format the provided data on a format that is analytics-friendly', function() {
      formattedPayload({ a: 1 }).should.eql({
        payload: {
          a: 1
        }
      });
      formattedPayload([1, 2, 3]).should.eql({
        payload: [1, 2, 3]
      });
    });

    it('should return null if data is falsy', function() {
      var val = formattedPayload();
      (val === null).should.eql(true);
    });

  });

  describe('payloadForSQSMessage', function() {

    it('should return a formatted payload for an SQS message', function() {
      var date = new Date(),
          payload = payloadForSQSMessage({
            MessageId: '123',
            Attributes: {
              ApproximateReceiveCount: 1,
              SentTimestamp: date.getTime(),
              ApproximateFirstReceiveTimestamp: date.getTime()
            }
          });

      payload.should.have.keys([
        'payload'
      ]);
      payload.payload.should.have.keys([
        'err',
        'message_id',
        'approx_receive_count',
        'sent_at',
        'approx_first_received_at'
      ]);
      (payload.payload.err === undefined).should.eql(true);
      payload.payload.message_id.should.eql('123');
      payload.payload.approx_receive_count.should.eql(1);
      payload.payload.sent_at.should.be.an.instanceof(Date);
      payload.payload.sent_at.toJSON().should.eql(date.toJSON());
      payload.payload.approx_first_received_at.should.be.an.instanceof(Date);
      payload.payload.approx_first_received_at.toJSON().should.eql(date.toJSON());
    });

    it('should take an optional error and include in the payload', function() {
      var date = new Date(),
          payload = payloadForSQSMessage({
            MessageId: '123',
            Attributes: {
              ApproximateReceiveCount: 1,
              SentTimestamp: date.getTime(),
              ApproximateFirstReceiveTimestamp: date.getTime()
            }
          }, new Error('test err'));

      payload.payload.err.should.be.an.instanceof(Error);
      payload.payload.err.message.should.eql('test err');
    });

    it('should return null if message is falsy', function() {
      var val = payloadForSQSMessage();
      (val === null).should.eql(true);
    });

  });

  describe('payloadDate', function() {

    it('should parse a string timestamp', function() {
      var actual = new Date(),
          json = actual.toJSON(),
          date = payloadDate(json);
      date.should.be.an.instanceof(Date);
      date.toJSON().should.eql(json);
    });

    it('should parse a epoch timestamp', function() {
      var actual = new Date(),
          json = actual.toJSON(),
          epoch = actual.getTime(),
          date = payloadDate(epoch);
      date.should.be.an.instanceof(Date);
      date.toJSON().should.eql(json);
    });

    it('should return undefined if timestamp is null', function() {
      (payloadDate(null) === undefined).should.eql(true);
    });

    it('should return undefined if timestamp is invalid', function() {
      (payloadDate('x') === undefined).should.eql(true);
    });

  });

});
