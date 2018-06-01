const glycobot = require('./glycobot');
const twitter = require('./twitter');
const writer = require('./message_writer');

const pipeline = (event) => {
  return glycobot(event)
  .then( writer );
};

const pipeline_with_reply = (event) => {
  return pipeline(event)
  .then( twitter.sendReplies );
};


pipeline( { direct_message_events: [{
                    message_create: {
                      message_data: { text: 'does dystroglycan 1 have sugars?'}
                    }
                  }]
                }).then( res => {
                  console.log(res);
                });

module.exports = pipeline_with_reply;