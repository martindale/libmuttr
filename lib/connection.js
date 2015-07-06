/**
* @module libmuttr/connection
*/

'use strict';

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
* @param {boolean}  options.logLevel
*/
function Connection(options) {
  if (!(this instanceof Connection)) {
    return new Connection(options);
  }

  events.EventEmitter.call(this);

  this.options = merge(Object.create(Connection.DEFAULTS), options);

  this._log = new kademlia.Logger(this.options.logLevel);
  this._natClient = nat.createClient();
}

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

    var ascii = new Buffer(value, 'hex').toString('ascii');

    try {
      self._validateMessageKey(key, ascii);
      self._validateMessageBody(ascii);
    } catch(err) {
      return callback(err);
    }

    callback(null, ascii);
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
    this._validateMessageKey(key, value);
    this._validateMessageBody(value);
  } catch(err) {
    return callback(err);
  }

  var hex = new Buffer(value, 'ascii').toString('hex');

  this.network.put(key, hex, callback);
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
    this.once('error', onConnect);
  }

  async.waterfall(stack, function(err) {
    if (err) {
      self._log.error(err.message);
      return self.emit('error', err);
    }

    self.emit('connect');
  });

  return this;
};

/**
* Ensure that the key is the SHA-1 hash of the value
* #_validateMessageKey
* @param {string} key
* @param {string} value
*/
Connection.prototype._validateMessageKey = function(key, value) {
  var hash = crypto.createHash('sha1').update(value).digest('hex');

  assert(hash === key, 'Message key must be the SHA1 hash of the value');
  pgp.message.readArmored(value); // will throw if not PGP message
};

/**
* Ensure that the message is PGP signed and encrypted
* #_validateMessageBody
* @param {string} body
*/
Connection.prototype._validateMessageBody = function(body) {
  var message = pgp.message.readArmored(body);
  var isEncrypted = !!message.getEncryptionKeyIds().length;

  assert(isEncrypted, 'Message must be encrypted');
};

/**
* Forward a port using NAT UPNP
* #_forwardPort
* @param {function} callback
*/
Connection.prototype._forwardPort = function(callback) {
  var self = this;

  if (this.options.forwardPort !== true) {
    return callback(null, this.options.address);
  }

  this._natClient.portMapping({
    public: this.options.port,
    private: this.options.port,
    ttl: 0 // indefinite lease
  }, function(err) {
    if (err) {
      self._log.warn(err.message);
      return callback(null, self.options.address);
    }

    self._natClient.externalIp(function(err, ip) {
      if (err) {
        self._log.warn(err.message);
        return callback(null, self.options.address);
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

module.exports = Connection;
