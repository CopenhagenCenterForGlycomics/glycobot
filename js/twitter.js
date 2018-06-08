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
      url: config.app.dm_endpoint,
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

  let send_reply = (resp,alt_id) => {
    if (resp.type === 'dm') {
      return methods.sendMessage(dm_body(resp.message,resp.source.source.message_create.sender_id)).then( () => null );
    }
    if (resp.type === 'tweet') {
      return methods.sendTweet(resp.message,alt_id ? alt_id : resp.source.source.id_str).then( resp => {
        return JSON.parse(resp.body).id_str;
      });
    }
  };


  methods.sendReplies = (responses,alt_id=null) => {
    console.log('We have ',responses.length,'responses to send');
    let resp = responses.shift();
    if ( ! resp ) {
      return Promise.resolve();
    }
    return send_reply(resp,alt_id).then( (last_id) => {
      console.log('We have ',responses.length,'remaining responses to send');
      return methods.sendReplies(responses,last_id);
    });
  };

  methods.sendTweet = (message,id) => new Promise((resolve, reject) => {
    let opts = {
      url: config.app.tweet_endpoint,
      oauth: config.oauth,
      qs: { status: message, in_reply_to_status_id: id, auto_populate_reply_metadata: 'true' }
    };
    // Send the message
    request.post(opts, function(error, response, body) {
      if (!error) {
        resolve(response);
      } else {
        reject(error);
      }
    });
  });


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