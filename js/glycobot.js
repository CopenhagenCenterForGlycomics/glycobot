const nlp = require('compromise');

const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const getData = require('./gator');

const SELF_USER_NAME = process.env.TWITTERSELFID;

const summarise_msdata = (msdatas) => {
  let compositions = [];
  let sources = [];
  let idxes = [];
  for (let msdata of msdatas) {
    let a_comp = '';
    msdata.data.forEach( pep => {
      for (let site of pep.sites) {
        if (site[1].match(/Hex/)) {
          if (idxes.indexOf(site[0]) < 0) {
            idxes.push(site[0]);
          }
        }
        if (compositions.indexOf(site[1]) < 0) {
          a_comp = site[1];
          compositions.push(site[1]);
        }
      }
      let all_comp = (pep.composition || [''])[0].replace(/\d+x/,'');
      if (all_comp && compositions.indexOf(all_comp) < 0) {
        compositions.push(all_comp);
        a_comp = all_comp;
      }
    });
    if (! a_comp.match(/Hex|GlcNAc|Fuc|Xyl/)) {
      continue;
    }
    let source = null;
    let sample = msdata.metadata.sample;
    if (sample) {
      if (sample.description) {
        source = sample.description;
      }
      if (sample.cell_type) {
        source = sample.cell_type + ' (cells from '+source+')';
      }
    }
    if (sources.indexOf(source) < 0) {
      sources.push(source);
    }

  }
  compositions = compositions.filter( comp => comp.match(/Hex|GlcNAc|Fuc|Xyl/));
  let is_sugar = compositions.length > 0;
  return { composition: compositions, sources: sources, sites: idxes };
};


let plugin = {
  tags:{
    Gene:{
      isA: 'Noun'
    },
    GeneFamily:{
      isA: 'Noun'
    }
  },
  words:{
  }
};

let symbol_data = {};

let family_data = {};

let symbreader = readline.createInterface({
  input: fs.createReadStream('./HGNC_06_2018.tsv.gz').pipe(zlib.createGunzip())
});
let count = 0;

symbreader.on('line', (line) => {
  let [symb,name,fam,uniprot] = line.split('\t');

  if ( ! uniprot ) {
    return;
  }

  symb = symb.toLowerCase();
  name = name.replace(/\s+(\d+)/g,"$1").toLowerCase();
  fam = fam.replace(/\|.*/,'').toLowerCase();
  plugin.words[symb] = 'Gene';
  plugin.words[name] = 'Gene';
  plugin.words[fam] = 'GeneFamily';
  if ( ! symbol_data[symb]) {
    symbol_data[symb] = {};
  }
  symbol_data[name] = symbol_data[symb];
  symbol_data[name].uniprot = uniprot;
  if ( ! family_data[fam]) {
    family_data[fam] = [];
  }
  family_data[fam].push(symb);
});

let has_symbols = new Promise( resolve => {
  symbreader.on('close', resolve);
}).then( () => {
  nlp.plugin(plugin);
});

const understand_query = (text) => {
  const url_expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
  const url_regex = new RegExp(url_expression);
  text = text.replace(url_regex,'');
  text = text.replace(/\s+(\d+)/g,"$1");

  let parsed = nlp(text);
  let genes = parsed.match('#Gene');
  let families = parsed.match('#GeneFamily');
  if (genes.length > 0) {
    let symbol = genes.out('text').trim().toLowerCase();
    return [ (symbol_data[ symbol ] || {}).uniprot ].map( up => {return { uniprot: up, symbol: symbol.toUpperCase() }; });
  } else if (families.length > 0) {
    let fam = families.out('text').trim().toLowerCase();
    return family_data[fam].map( symb => {return { uniprot: (symbol_data[symb.toLowerCase()] || {}).uniprot, symbol: symb.toUpperCase() }; });
  }
  return [];
};

const should_reply_to = (tweet) => {
  // Tweet replies
  if ( tweet.in_reply_to_status_id_str ) {
    if (tweet.in_reply_to_screen_name === SELF_USER_NAME) {
      // Do not respond to tweets replying to a tweet we made
      console.log('Not replying to tweet ',tweet.text);
      return false;
    }
    // If we have been mentioned in a reply, we should reply
    return true;
  }

  // Quote tweets
  if ( tweet.quoted_status ) {
    if ( tweet.in_reply_to_screen_name === SELF_USER_NAME ) {
      // We should think about hoisting the quoted text?
      return true;
    }
    if (tweet.entities.user_mentions.filter( u => u.screen_name === SELF_USER_NAME).length > 0) {
      // We should think about hoisting the quoted text?
      return true;
    }
    console.log('Not replying to quote tweet',tweet.text);
    return false;
  }

  // Retweets
  if ( tweet.retweeted_status ) {
    // We do not respond to anyone retweeting our replies
    console.log('Not replying to retweet',tweet.text);
    return false;
  }

  return true;
};

const handle_tweets = (tweets) => {
  if ( ! should_reply_to(tweets[0])) {
    return Promise.resolve([]);
  }
  console.log('Replying to ',tweets[0].text);
  return handle_messages([{ message: tweets[0], source: tweets[0] }],'tweet');
};

const handle_dms = (dms) => {
  let message_objs = dms.map( dm => { return {message: dm.message_create.message_data, source: dm }; });
  return handle_messages(message_objs,'dm');
};

const handle_messages = (messages,type) => {
  return has_symbols.then( () => {
    let results = [];
    return Promise.all( messages.map( message => {
      let text = message.message.text;
      let ids = understand_query(text);
      if (ids.length < 1 && message.message.quoted_status) {
        console.log(`No ids identified, trying quoted tweet text "${message.message.quoted_status.text}"`);
        ids = understand_query(message.message.quoted_status.text);
      }
      if (ids.length > 0) {
        console.log('Understood',ids,'from query');
      }
      let uniprots = ids.map( id => id.uniprot );
      ids = ids.filter( (o,i,a) => uniprots.indexOf(o.uniprot) === i );

      if (ids.length === 0) {
        return Promise.resolve({ source: message, type: type, error: 'NO_GENE' });
      }

      return getData(ids.map( id => id.uniprot )).then( res => {
        let result = { source: message, type: type, proteins: [], ids: ids };
        let any_data = false;
        for (let prot of res) {
          let msdatas = prot.data.filter( dat => (dat.metadata || {}).mimetype == 'application/json+msdata');
          let summarised = summarise_msdata(msdatas);
          result.proteins.push(summarised);
          if ( summarised.composition.length > 0 || summarised.sources.length > 0 || summarised.sites.length > 0) {
            any_data = true;
          }
        }
        if ( res.length > 0 && ! any_data ) {
          result.error = 'NO_SITEDATA';
        }
        return result;
      });
    }));
  });
};

const handle_event = function(event) {
  if (event.tweet_create_events) {
    return handle_tweets(event.tweet_create_events);
  }
  if (event.direct_message_events) {
    return handle_dms(event.direct_message_events);
  }
  return Promise.resolve([]);
};

const test_strings = [
  'is dag1 glycosylated?',
  'is there anything on CELSR cadherins',
  'gene apoe',
  'cadherin 1',
  'CDH1',
  'does NID1 have sugars?',
  'do nucleoporins have sugars?'
];

module.exports = handle_event;