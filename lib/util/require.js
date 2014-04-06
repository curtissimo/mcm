exports.override = function(dir, req) {
  if(process.env['MCM_ENV'] !== 'development') {
    return req;
  }

  var path = require('path')
    , f = function(library) {
        if(library[0] === '.' || library.indexOf(dir) === 0) {
          var libpath = library[0] === '.'?
                        require.resolve(path.join(dir, library)) :
                        require.resolve(library)
            , lib = require(libpath)
            ;
          delete require.cache[libpath];
          return lib;
        }
        return require(library);
      }
    ;
  f.cache = require.cache;
  f.resolve = require.resolve;
  return f;
}
