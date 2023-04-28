const fs = require('fs');
const path = require('path');
//const { createScript } = require('node-redis-script');

function readRedisScript(scriptName) {
  const filepath = path.resolve(__dirname, `./lua/${scriptName}.lua`);
  const src = fs.readFileSync(filepath, { encoding: 'utf-8' });
  return src;
}

const ParityDeleteScript = (scriptName) => {
  var lua = {
    script: readRedisScript(scriptName),
    sha: null
  };

  //var _redis;

  return {
    init: (redis) => {
      var _redis = redis;
      _redis.scriptLoad(lua.script).then(sha => {
            lua.sha = sha;
          }).catch(err => {
            throw new Error(err);
        });


      return (key, id) => {
        return _redis.eval(lua.script, {
          keys: [key, id]
        });
        
      }
    }
  }
}


const ParityRelockScript = (scriptName) => {
  var lua = {
    script: readRedisScript(scriptName),
    sha: null
  };

  return {
    init: (redis) => {
      var _redis = redis;
      _redis.scriptLoad(lua.script).then(sha => {
            lua.sha = sha;
          }).catch(err => {
            throw new Error(err);
        });


      return (key, ttl, id) => {        
        return _redis.eval(lua.script, {
          keys: [key, ttl, id]
        });
        
      }
    }
  }
}


module.exports.ParityDel = ParityDeleteScript('parityDel');
module.exports.ParityRelock = ParityRelockScript('parityRelock');