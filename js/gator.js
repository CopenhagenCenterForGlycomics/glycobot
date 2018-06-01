const fetch = require('node-fetch');

const API_URL='https://glycodomain.glycomics.ku.dk/api'

const API_KEY = process.env.GATOR_API_KEY;

let authenticate = () => {
  return fetch(API_URL+'/login?cachebuster'+new Date().getTime(),
  {
    headers: { 'x-api-key': API_KEY }
  })
  .then( res => res.json() )
  .then( auth => auth.id_token );
}

let get_data_for_id = (id,token) => {
  return fetch(API_URL+'/data/latest/combined/'+id,{
    method: 'GET',
    headers: { 'Authorization' : 'Bearer '+token,
               'x-api-key' : API_KEY },
  }).then( res => res.json() );
};


let getData = (ids) => {
  return authenticate().then( token => {
    return Promise.all( ids.map( id => get_data_for_id(id,token) ) );
  });
};

module.exports = getData;