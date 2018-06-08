
const sentence = (arr) => {
  return arr.slice(0, -2).join(', ') +
    (arr.slice(0, -2).length ? ', ' : '') +
    arr.slice(-2).join(' & ');
};

const handle_family = (ids,prots) => {
  let with_glyco = prots.filter( prot => prot.sites.length > 0 || prot.composition.length > 0 );
  let family_symbols = sentence(ids.map( id => id.symbol ).slice(0,5));
  if ((with_glyco.length / prots.length) < 0.25) {
    return `For the family including ${family_symbols} only a few proteins have sugars: ${with_glyco.length}/${prots.length} do`;
  }
  if ((with_glyco.length / prots.length) <= 0.5) {
    return `For the family including ${family_symbols} there are some proteins with sugars: ${with_glyco.length}/${prots.length} do`;
  }
  if ((with_glyco.length / prots.length) > 0.5) {
    return `For the family including ${family_symbols}, there are a few proteins with sugars! ${with_glyco.length}/${prots.length} do`;
  }
};

const handle_protein = (id,prot) => {
  let site_statement = prot.sites.length >= 20 ? 'lots of sites' : 'a few sites';
  if (prot.sites.length == 0) {
    site_statement = 'no sites';
  }
  let composition = prot.composition;
  let has_t = composition.filter( comp => comp.match(/HexHexNAc/) ).length > 0;
  let has_tn = composition.filter( comp => comp.match(/^HexNAc/) ).length > 0;
  let has_nlinked = composition.filter( comp => comp.match(/^GlcNAc\(b1-4\)/) ).length > 0;
  let has_oman = composition.filter( comp => comp.match(/^Hex$/) ).length > 0;
  let comp_statement = sentence([ has_t ? 'Core 1 O-GalNAc' : '',
                         has_tn ? 'truncated O-GalNAc' : '' ,
                         has_nlinked ? 'N-Linked glycans' : '',
                         has_oman ? 'O-Mannose' : '' ].filter( t => t));
  let source_statement = sentence(prot.sources.filter( t => t));

  return `I checked the protein for ${id.symbol} (${id.uniprot}): There are ${site_statement} ${comp_statement ? 'with '+comp_statement : ''} based on data from ${source_statement}`;
};

const handle_single = (response) => {
 if (response.type == 'dm' || response.type == 'tweet') {
    if (response.error == 'NO_GENE') {
      response.message = 'I didn\'t recognise any gene names';
      return [ response ];
    }
    if (response.error == 'NO_SITEDATA') {
      response.message = `I don\'t have any site data for the protein encoded by ${response.ids[0].symbol}.`;
      return [ response ];
    }

    if (response.proteins.length > 1) {
      response.message = handle_family(response.ids,response.proteins);
      return [ response ];
    }
    if (response.proteins.length == 1) {
      response.message = handle_protein(response.ids[0],response.proteins[0]);
      gdv_link_resp = { type: response.type, source: response.source, message: `Full data at: https://glycodomain.glycomics.ku.dk/uniprot/${response.ids[0].uniprot}`}
      return [ response, gdv_link_resp ];
    }
    if (response.proteins.length == 0) {
      response.message = 'I didn\'t recognise the gene or couldn\'t find a protein!';
      return [ response ];
    }
  }
};

const handle = (responses) => {
  let mapped_responses = responses.map( handle_single );
  let all_responses = [].concat.apply([],mapped_responses);
  return all_responses;
};

module.exports = handle;