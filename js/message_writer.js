
const handle_family = (prots) => {
  let with_glyco = prots.filter( prot => prot.sites.length > 0 || prot.composition.length > 0 );
  if ((with_glyco.length / prots.length) < 0.25) {
    return `Only a few proteins have sugars: ${with_glyco.length} out of ${prots.length}`;
  }
  if ((with_glyco.length / prots.length) <= 0.5) {
    return `There are some proteins with sugars: ${with_glyco.length} out of ${prots.length}`;
  }
  if ((with_glyco.length / prots.length) > 0.5) {
    return `There are a few proteins! ${with_glyco.length} out of ${prots.length}`;
  }
};

const handle_protein = (prot) => {
  let site_statement = prot.sites.length >= 20 ? 'lots of sites' : 'a few sites';
  if (prot.sites.length == 0) {
    site_statement = 'no specific sites';
  }
  let composition = prot.composition;
  let has_t = composition.filter( comp => comp.match(/HexHexNAc/) ).length > 0;
  let has_tn = composition.filter( comp => comp.match(/^HexNAc/) ).length > 0;
  let has_nlinked = composition.filter( comp => comp.match(/^GlcNAc\(b1-4\)/) ).length > 0;
  let has_oman = composition.filter( comp => comp.match(/^Hex/) ).length > 0;
  let comp_statement = [ has_t ? 'Core 1 O-GalNAc' : '',
                         has_tn ? 'Truncated O-GalNAc' : '' ,
                         has_nlinked ? 'N-Linked glycans' : '',
                         has_oman ? 'O-Mannose' : '' ].join(',').trim().replace(/,,+/g,',');
  let source_statement = prot.sources.join(',');

  return `We saw on ${prot.acc} ${site_statement}, ${comp_statement ? 'with '+comp_statement : ''} in ${source_statement}`;
};

const handle_single = (response) => {
  if (response.type == 'dm') {
    if (response.proteins.length > 1) {
      response.message = handle_family(response.proteins);
      return response;
    }
    if (response.proteins.length == 1) {
      response.message = handle_protein(response.proteins[0]);
      return response;
    }
    if (response.proteins.length == 0) {
      response.message = 'Protein not found';
      return response;
    }
  }
};

const handle = (responses) => {
  return responses.map( handle_single );
};

module.exports = handle;