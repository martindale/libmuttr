/**
* @module libmuttr/connection
*/

var kademlia = require('kad');
var assert = require('assert');
var events = require('events');
var nat = require('nat-upnp');
var async = require('async');
var merge = require('merge');
var crypto = require('crypto');
var pgp = require('openpgp');
var inherits = require('util').inherits;
var Identity = require('./identity');
var utils = require('./utils');
var logger = new kademlia.Logger();

inherits(Connection, events.EventEmitter);

Connection.DEFAULTS = {
  address: '0.0.0.0',
  port: 44678,
  forwardPort: false
};

/**
* Creates a connection the the Muttr DHT
* @constructor
* @param {object}   options
* @param {string}   options.address
* @param {number}   options.port
* @param {array}    options.seeds
* @param {object}   options.seeds[]
* @param {string}   options.seeds[].address
* @param {number}   options.seeds[].port
* @param {object}   options.storage
* @param {function} options.storage.get
* @param {function} options.storage.put
* @param {function} options.storage.del
* @param {function} options.storage.createReadStream
* @param {boolean}  options.forwardPort
*/
function Connection(options) {
  if (!(this instanceof Connection)) {
    return new Connection(options);
  }

  events.EventEmitter.call(this);

  this.options = merge(Object.create(Connection.DEFAULTS), options);
}

/**
* Ensure that the key is the SHA-1 hash of the value
* #validateMessageKey
* @param {string} key
* @param {string} value
*/
Connection.prototype.validateMessageKey = function(key, value) {
  var hash = crypto.createHash('sha1').update(value).digest('hex');

  assert(hash === key, 'Message key must be the SHA1 hash of the value');
  pgp.message.readArmored(value); // will throw if not PGP message
};

/**
* Get an encrypted message by it's hash from the DHT
* #get
* @param {string} key
* @param {function} callback
*/
Connection.prototype.get = function(key, callback) {
  var self = this;

  this.network.get(key, function(err, value) {
    if (err) {
      return callback(err);
    }

    try {
      this.validateMessageKey(key, value);
    } catch(err) {
      return callback(err);
    }

    callback(null, value);
  });
};

/**
* Put an encrypted message by it's hash in the DHT
* #put
* @param {string} key
* @param {string} value
* @param {function} callback
*/
Connection.prototype.put = function(key, value, callback) {
  try {
    this.validateMessageKey(key, value);
  } catch(err) {
    return callback(err);
  }

  this.network.put(key, value, callback)
};

/**
* Initialize connection to DHT and handle port forwarding if needed
* #open
* @param {function} onConnect
*/
Connection.prototype.open = function(onConnect) {
  var self = this;
  var stack = [
    this._forwardPort.bind(this),
    this._joinNetwork.bind(this)
  ];

  if (typeof onConnect === 'function') {
    this.once('connect', onConnect);
  }

  async.waterfall(stack, function(err) {
    if (err) {
      logger.error(err.message);
      self.emit('error', err);
    }

    self.emit('connect');
  });
};

/**
* Forward a port using NAT UPNP
* #_forwardPort
* @param {function} callback
*/
Connection.prototype._forwardPort = function(callback) {
  if (this.options.forwardPort !== true) {
    return callback(null, this.options.address);
  }

  var client = nat.createClient();

  client.portMapping({
    public: this.options.port,
    private: this.options.port,
    ttl: 0 // indefinite lease
  }, function(err) {
    if (err) {
      logger.warn(err.message);
      return callback(null, this.options.address);
    }

    client.externalIp(function(err, ip) {
      if (err) {
        logger.warn(err.message);
        return callback(null, this.options.address);
      }

      callback(null, ip);
    });
  });
};

/**
* Initialize connection to DHT
* #_joinNetwork
*/
Connection.prototype._joinNetwork = function(ip, callback) {
  this.options.address = ip;
  this.network = kademlia(this.options);

  this.network.once('connect', function() {
    callback();
  });

  this.network.once('error', function(err) {
    callback(err);
  });
};
