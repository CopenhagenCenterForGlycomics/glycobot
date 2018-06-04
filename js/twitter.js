const request = require('request');
const crypto = require('crypto');

/**
 * Twitter object for direct message interactions
 * @param {Object} config - twitter parameters
 * @return {Object} Function methods
 **/
module.exports = function(config) {
  let methods = {};

  /**
    * Prepares Twitter message request object
    * @function _prepareRequest
    * @param {Object} body - message body object
    * @return {Object} - Twitter message request object
  **/
  methods._prepareRequest = function(body) {
    let requestOptions = {
      url: config.app.twitter_endpoint,
      oauth: config.oauth,
      json: true,
      headers: {
        'content-type': 'application/json',
      },
      body: body,
    };
    // Log the message
    console.log('Outgoing DMessage object: ' + JSON.stringify(body));
    return requestOptions;
  };

  /**
    * Prepares Twitter CRC response
    * @function crcResponse
    * @param {Object} token - request token
    * @return {Object} - Twitter CRC response
  **/
  methods.crcResponse = (token) => new Promise((resolve, reject) => {
    let hash = crypto.createHmac('sha256', config.app.consumer_secret)
      .update(token)
      .digest('base64');
    let hashstring = 'sha256=' + hash;
    let response = JSON.parse('{"response_token": "'+hashstring+'"}');
    resolve(response);
  });

  const dm_body = (message,parent) => JSON.parse(`{
  "event": {
    "type": "message_create",
    "message_create": {
      "target": { "recipient_id": "${parent}" },
      "message_data": { "text": "${message}" }
    }
  }
  }`);

  const tweet_body = (message,parent) => JSON.parse(`{
  "event": {
    "type": "message_create",
    "message_create": {
      "target": {
        "recipient_id": "${parent}"
      },
      "message_data": {
        "text": "${message}",
      }
    }
  }
  }`);

  methods.sendReplies = (responses) => {
    let resp_promises = [];
    for (let resp of responses) {
      if (resp.type === 'dm') {
        if (resp.source.message_create.sender_id === process.env.TWITTER_SELF_ID) {
          console.log('Do not send to self');
          return;
        }
        resp_promises.push(methods.sendMessage(dm_body(resp.message,resp.source.message_create.sender_id)));
      }
    }
    return Promise.all(resp_promises);
  };

  /**
   * Send direct Twitter message
   * @function sendMessage
   * @param {Object} body - Twitter direct message body object
   * @return {Object} - Response object from Twitter
   **/
  methods.sendMessage = (body) => new Promise((resolve, reject) => {
    let opts = methods._prepareRequest(body);
    // Send the message
    request.post(opts, function(error, response, body) {
      if (!error) {
        resolve(response);
      } else {
        reject(error);
      }
    });
  });
return methods;
}