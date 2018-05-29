const nlp = require('compromise');

const understand_query = (text) => {
  let parsed = nlp(text);
  let verb_length = parsed.verbs().length;
  if (verb_length < 1) {
    return [text.trim()];
  } else {
    return parsed.nouns().map( n => n.out('text').trim() );
  }
};

const handle_tweets = () => {};

const handle_dms = (dms) => {
  for (let dm of dms) {
    let text = dm.message_create.message_data.text;
    let keywords = understand_query(text);
  }
};


const handle_event = function(event) {
  if (event.tweet_create_events) {
    return handle_tweets(event.tweet_create_events);
  }
  if (event.direct_message_events) {
    return handle_dms(event.direct_message_events);
  }
};

const test_strings = [
  'is dag1 glycosylated?',
  'is there anything on cadherins',
  'gene apoe',
  'cadherin 1',
  'CDH1',
  'does NID1 have sugars?'
];

for (let string of test_strings) {
  console.log(understand_query(string));
}
// console.log(doc.topics().data());

module.exports = handle_event;