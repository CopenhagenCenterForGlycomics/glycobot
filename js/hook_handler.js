// Function for sending twitter DMs
const twitter = require('./twitter');

const config = {
  oauth: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET
  },
  app: {
    twitter_endpoint: `https://api.twitter.com/1.1/direct_messages/events/new.json`,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET
  }
};

/**
 * Webhook handler for incoming Twitter DMs
 * @function twitterWebhook
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @param {Function} callback - Callback
 */
module.exports.hook = (event, context, callback) => {
  if (event.httpMethod === 'GET') {
    let crcToken = event.queryStringParameters['crc_token'];
    if (crcToken) {
      twitter(config).crcResponse(crcToken)
        .then( response => {
          callback(null,{
            isBase64Encoded: false,
            statusCode: 200,
            headers: {},
            body: JSON.stringify(response),
          });
        })
        .catch( err => { console.log(err); throw(err); });
    } else {
      const response = {
        isBase64Encoded: false,
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*', // Required for CORS
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({'message':
          `Error: crc_token missing from request.`}),
      };
      callback(null, response);
    }
  } else if (event.httpMethod === 'POST') {
    console.log('Got POST');
    console.log(event);
    callback(null);
  }
};
