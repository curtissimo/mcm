var env = process.env['MCM_ENV'] || 'production'
  , db = {
      production: {
        host: 'http://192.168.180.173:5984'
      , name: 'gillysuit'    
      }
    , uat: {
        host: 'http://192.168.180.173:5984'
      , name: 'manchuria'
    }
    , development: {
        host: 'http://couchdb:5984'
      , name: 'gillysuit'
      }
    }
  , site = {
      production: {
        domain: 'grayiris.com'
      , port: 8019
      }
    , uat: {
        domain: 'grayiris.com'
      , port: 8018
      }
    , development: {
        domain: 'mcm.dev'
      , port: 3000
      }
    }
  ;

(function(module) {
  module.exports = {
    db: db[env]
  , site: site[env]
  , inDev: env === 'development'
  }
})(module);
