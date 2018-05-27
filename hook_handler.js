// Function for sending twitter DMs
const twitter = require('./twitter');

const config = {
  oauth: {
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET
  },
  app: {
    twitter_endpoint: `https://api.twitter.com/1.1/direct_messages/events/new.json`,
  }
};

/**
 * Webhook handler for incoming Twitter DMs
 * @function twitterWebhook
 * @param {Object} event - AWS Lambda event object
 * @param {Object} context - AWS Lambda context object
 * @param {Function} callback - Callback
 */
module.exports.twitterWebhook = (event, context, callback) => {
  if (event.method === 'GET') {
    let crcToken = event.query['crc_token'];
    if (crcToken) {
      twitter(config).crcResponse(crcToken)
        .then((response) => callback(response));
    } else {
      const response = {
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
  } else if (event.method === 'POST') {
    console.log(event);
    callback(null);
  }
};
