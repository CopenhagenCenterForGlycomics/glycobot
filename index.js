const twitter = require('./js/hook_handler');

module.exports = {};

module.exports.twitterWebhook = twitter.hook;


module.exports.twitterWebhook({httpMethod: 'GET', queryStringParameters: { crc_token: 'crc_token'}})