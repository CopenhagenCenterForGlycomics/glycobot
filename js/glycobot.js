const nlp = require('compromise');

const fs = require('fs');
const zlib = require('zlib');
const readline = require('readline');
const getData = require('./gator');

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
    if (! a_comp.match(/Hex|GlcNAc/)) {
      continue;
    }
    let source = null;
    let sample = msdata.metadata.sample;
    if (sample) {
      if (sample.description) {
        source = sample.description;
      }
      if (sample.cell_type) {
        source = sample.cell_type + ' ('+source+')';
      }
    }
    if (sources.indexOf(source) < 0) {
      sources.push(source);
    }

  }
  compositions = compositions.filter( comp => comp.match(/Hex|GlcNAc/));
  let is_sugar = compositions.length > 0;
  return { composition: compositions, sources: sources, sites: idxes, acc: msdatas[0].acc.toUpperCase() };
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
  text = text.replace(/\s+(\d+)/g,"$1");

  let parsed = nlp(text);
  let genes = parsed.match('#Gene');
  let families = parsed.match('#GeneFamily');
  if (genes.length > 0) {
    return [ (symbol_data[ genes.out('text').trim().toLowerCase() ] || {}).uniprot ];
  } else if (families.length > 0) {
    let fam = families.out('text').trim().toLowerCase();
    return family_data[fam].map( symb => (symbol_data[symb.toLowerCase()] || {}).uniprot );
  }
  return '';
};

const handle_tweets = () => {};

const handle_dms = (dms) => {
  return has_symbols.then( () => {
    let results = [];
    return Promise.all( dms.map( dm => {
      let text = dm.message_create.message_data.text;
      let ids = understand_query(text).filter( (o,i,a) => a.indexOf(o) === i );
      return getData(ids).then( res => {
        let dm_result = { source: dm, type: 'dm', proteins: [] };
        for (let prot of res) {
          let msdatas = prot.data.filter( dat => (dat.metadata || {}).mimetype == 'application/json+msdata');
          dm_result.proteins.push(summarise_msdata(msdatas));
        }
        return dm_result;
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