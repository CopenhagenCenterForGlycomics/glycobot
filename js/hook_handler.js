// Function for sending twitter DMs
const twitter = require('./twitter');


const config = {
  oauth: {
    token: process.env.TWITTER_ACCESS_TOKEN,
    token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET
  },
  app: {
    dm_endpoint: `https://api.twitter.com/1.1/direct_messages/events/new.json`,
    tweet_endpoint: `https://api.twitter.com/1.1/statuses/update.json`,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET
  }
};

const glycobot_pipeline = require('./glycobot_pipeline');


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
    let signature = event.headers['X-Twitter-Webhooks-Signature'] || event.headers['x-twitter-webhooks-signature'];
    twitter(config).crcResponse(event.body).then( resp => {
      if ( signature === resp.response_token ) {
        return JSON.parse(event.body);
      }
      throw new Error('Invalid CRC');
    }).then( twitter_event => {
      console.log(JSON.stringify(twitter_event));
      return glycobot_pipeline(twitter_event)
      .then( res => callback(null,res) );
    }).catch( err => callback );
  }
};
