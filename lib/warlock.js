const UUID = require('uuid');
const {  ParityDel, ParityRelock } = require('./scripts');

module.exports = function (redis) {
  const warlock = {};

  const parityDel = ParityDel.init(redis);
  const parityRelock = ParityRelock.init(redis);

  warlock.makeKey = function (key) {
    return `${key}:lock`;
  };

  /**
   * Set a lock key
   * @param {string}   key    Name for the lock key. String please.
   * @param {integer}  ttl    Time in milliseconds for the lock to live.
   * @param {Function} cb
   */
  warlock.lock = async function (key, ttl, cb) {
    cb = cb || function () {};

    if (typeof key !== 'string') {
      return cb(new Error('lock key must be string'));
    }

    let id;
    UUID.v1(null, (id = new Buffer(16)));
    id = id.toString('base64');

    const warlockKey = warlock.makeKey(key);    
    let A = await redis.sendCommand(['SET', warlockKey, id, 'EX', ttl.toString(), 'NX']) // 'OK'    
    .then((lockSet) => {
        console.log("Lock: ?");
        console.log(lockSet);

        err = null 
        const unlock = lockSet ? warlock.unlock.bind(warlock, key, id) : false;
        return cb(err, unlock, id);
    }).catch((err) => {
          return cb(err);
    } );

    return key;
  };

  warlock.unlock = async (key, id, cb) => {
    cb = cb || function () {};

    if (typeof key !== 'string') {
      return cb(new Error('lock key must be string'));
    }

    const numKeys = 1;
    const _key = warlock.makeKey(key);
    try {
      const result = await parityDel( _key, id);

      console.log('Unlock: ?');
      console.log(result);

      cb(null, result);
    } catch (e) {
      cb(e);
    }
  };


  /**
   * Set a lock optimistically (retries until reaching maxAttempts).
   */
  warlock.optimistic = function (key, ttl, maxAttempts, wait, cb) {
    let attempts = 0;

    var tryLock = function () {
      attempts += 1;
      warlock.lock(key, ttl, (err, unlock) => {
        if (err) return cb(err);

        if (typeof unlock !== 'function') {
          if (attempts >= maxAttempts) {
            const e = new Error('unable to obtain lock');
            e.maxAttempts = maxAttempts;
            e.key = key;
            e.ttl = ttl;
            e.wait = wait;
            return cb(e);
          }
          return setTimeout(tryLock, wait);
        }

        return cb(err, unlock);
      });
    };

    tryLock();
  };

  warlock.touch = async (key, id, ttl, cb) => {
    if (typeof key !== 'string') {
      const e = new Error('lock key must be string');
      e.id = id;
      e.key = key;
      e.ttl = ttl;
      if (!cb) throw e;
      return cb(e);
    }

    try {
      const _key = warlock.makeKey(key);
      const result = await parityRelock(_key.toString(), ttl.toString(), id.toString());
      console.log('Relock: ?');
      console.log(result);

      return cb ? cb(null, result) : result;
    } catch (e) {
      if (!cb) throw e;
      return cb(e);
    }
  };

  return warlock;
};
