const glycobot = require('./glycobot');
const twitter = require('./twitter');
const writer = require('./message_writer');

const config = {
  oauth: {
    token: process.env.TWITTER_ACCESS_TOKEN,
    token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET
  },
  app: {
    twitter_endpoint: `https://api.twitter.com/1.1/direct_messages/events/new.json`,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET
  }
};

const pipeline = (event) => {
  return glycobot(event).then( writer );
};

const pipeline_with_reply = (event) => {
  return pipeline(event)
  .then( (resp) => twitter(config).sendReplies(resp) );
};

let message_text = 'Type I classical cadherins';

let message = {
"for_user_id":"17054080",
"direct_message_events":[
{"type":"message_create","id":"1001547747303059460","created_timestamp":"1527622565471","message_create":{"target":{"recipient_id":"875441565895991298"},"sender_id":"17054080","source_app_id":"268278","message_data":{"text": message_text ,"entities":{"hashtags":[],"symbols":[],"user_mentions":[],"urls":[]}}}}],"apps":{"268278":{"id":"268278","name":"Twitter Web Client","url":"http:\\/\\/twitter.com"}},"users":{"17054080":{"id":"17054080","created_timestamp":"1225319884000","name":"Hiren Joshi","screen_name":"hirenj","location":"Copenhagen, Denmark","description":"Glycobioinfonaut at the Copenhagen Center for Glycomics.","url":"https:\\/\\/t.co\\/c0aM0tvKle","protected":false,"verified":false,"followers_count":96,"friends_count":65,"statuses_count":711,"profile_image_url":"http:\\/\\/pbs.twimg.com\\/profile_images\\/881232756906369026\\/lf2-D3A3_normal.jpg","profile_image_url_https":"https:\\/\\/pbs.twimg.com\\/profile_images\\/881232756906369026\\/lf2-D3A3_normal.jpg"},"875441565895991298":{"id":"875441565895991298","created_timestamp":"1497556509019","name":"O-Fucose Mannose","screen_name":"o_fuc_man","location":"Mostly extracellular, but also cytosolic","description":"I don\'t mean to be rude, but I can see your glycocalyx.","protected":false,"verified":false,"followers_count":0,"friends_count":0,"statuses_count":0,"profile_image_url":"http:\\/\\/abs.twimg.com\\/sticky\\/default_profile_images\\/default_profile_normal.png","profile_image_url_https":"https:\\/\\/abs.twimg.com\\/sticky\\/default_profile_images\\/default_profile_normal.png"}}};

// pipeline( message )
// .then( res => {
//                   console.log('Final',res);
//                 })
// .catch( err => console.error(err) );

module.exports = pipeline_with_reply;