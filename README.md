# sqs-processor

[![Greenkeeper badge](https://badges.greenkeeper.io/Springworks/node-sqs-processor.svg)](https://greenkeeper.io/)

Module for SQS queue processing


# API

## `exports.create(iterator, config, logger)`

### Params

| path     | type     | presence | description                                                                     |
|----------|----------|----------|---------------------------------------------------------------------------------|
| iterator | function | required | A function that handles a single queue message. See [Iterator][iterator] below. |
| config   | object   | required | See [Module config][module-config] below.                                       |
| logger   | Bunyan   | required | Bunyan logger instance.                                                         |


### Iterator

The function passed as the first argument to `create` is intended to implement the handling of queued messages.
It will be applied to each message as they are fetched from the queue. The iterator is also passed a `callback(err)` which must be called once it has completed. If no error has occurred, the callback should be run without arguments or with an explicit null argument.


### Module config

| path                  | type   | presence | description                                                     | default        | conforms                          | unit         | valids                                                                                                  | invalids |
|-----------------------|--------|----------|-----------------------------------------------------------------|----------------|-----------------------------------|--------------|---------------------------------------------------------------------------------------------------------|----------|
| -                     | object | required | Module config                                                   |                |                                   |              |                                                                                                         |          |
| queue_name            | string | required | Name of the SQS queue                                           |                |                                   |              |                                                                                                         | `""`     |
| region                | string | optional | AWS region                                                      | `"eu-west-1"`  |                                   |              |                                                                                                         | `""`     |
| api_version           | string | optional | AWS SQS API version                                             | `"2012-11-05"` |                                   |              |                                                                                                         | `""`     |
| batch_timeout         | number | optional | Timeout after which a new batch will be forced to start         | `60000`        | `integer`, `min: 0`               | milliseconds |                                                                                                         |          |
| batch_force_threshold | number | optional | An error is emitted if batches timeout this many times in a row | `5`            | `integer`, `min: 0`               |              |                                                                                                         |          |
| visibility_timeout    | number | optional | The visibility timeout for the queue                            | `30`           | `integer`, `min: 0`, `max: 43200` | seconds      |                                                                                                         |          |
| wait_time_seconds     | number | optional | Long-polling timeout (0 = short-polling)                        | `20`           | `integer`, `min: 0`               | seconds      |                                                                                                         |          |
| max_nof_messages      | number | optional | Max messages to receive per request                             | `10`           | `integer`, `min: 1`, `max: 10`    |              |                                                                                                         |          |
| attribute_names       | array  | optional | Attributes to be returned along with each message               | `["All"]`      |                                   |              |                                                                                                         |          |
| attribute_names[+0]   | string | optional |                                                                 |                |                                   |              | `"All"` `"ApproximateFirstReceiveTimestamp"` `"ApproximateReceiveCount"` `"SenderId"` `"SentTimestamp"` | `""`     |


### Returned object

The create function returns an object with the following methods: [startProcessingQueue][startprocessingqueue] and [stopAfterCurrentBatch][stopaftercurrentbatch].

### Events

The returned object from `create` is also an event emitter and may emit the following events:

- `error` The error event is emitted if the [iterator][iterator] times out `config.batch_force_threshold` number of times.


## `startProcessingQueue()`

Start processing queue.
Takes no arguments and return nothing.


## `stopAfterCurrentBatch()`

Stop processing queue after the current message batch is done.
The module will keep calling the [iterator][iterator] until the current batch is depleted but will not fetch a new batch.
Takes no arguments and return nothing.
