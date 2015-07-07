/**
* @module libmuttr/session
*/

'use strict';

var Identity = require('./identity');
var Client = require('./client');
var Connection = require('./connection');
var utils = require('./utils');
var assert = require('assert');
var inherits = require('util').inherits;
var merge = require('merge');
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var pgp = require('openpgp');
var crypto = require('crypto');

Session.DEFAULTS = {
  subscribe: true
};

inherits(Session, EventEmitter);

/**
* Creates a sandbox for Muttr apps by the given identity
* @constructor
* @param {Identity} identity
* @param {Connection} connection
* @param {object} options
*/
function Session(identity, connection, options) {
  if (!(this instanceof Session)) {
    return new Session(identity, connection, options);
  }

  assert(identity instanceof Identity, 'Invalid identity supplied');
  assert(connection instanceof Connection, 'Invalid connection supplied');

  this.options = merge(Object.create(Session.DEFAULTS), options);
  this.client = new Client(identity);

  this._identity = identity;
  this._connection = connection;

  this._connection.open(this._onConnect.bind(this));

  if (this.options.subscribe) {
    this.client.on('message', this._onMessage.bind(this)).subscribe();
  }
}

/**
* Store message in network and notify the recipients' pods
* #send
* @param {string} recipient
* @param {string} message
* @param {function} callback
*/
Session.prototype.send = function(recipient, message, callback) {
  var self = this;

  async.waterfall([
    self._identity.sign.bind(self._identity, message),
    getPublicKeyForEncryption,
    self._identity.encrypt.bind(self._identity),
    storeMessageInDHT,
    self.client.sendMessageKey.bind(self.client, recipient)
  ], onComplete);

  function getPublicKeyForEncryption(signed, next) {
    self.client.getPublicKeyForUserID(recipient, function(err, key) {
      if (err) {
        return next(err);
      }

      next(null, [pgp.key.readArmored(key).keys[0]], signed);
    });
  }

  function storeMessageInDHT(encrypted, next) {
    var hash = crypto.createHash('sha1').update(encrypted).digest('hex');

    self._connection.put(hash, encrypted, function(err) {
      next(err, hash);
    });
  }

  function onComplete(err, message) {
    if (err) {
      return callback(err);
    }

    Object.defineProperty(message, 'text', {
      value: message,
      configurable: false,
      enumerable: false
    });

    callback(null, message);
  }
};

/**
* Fetches messages missed and stored at the pod, then deletes them
* #playback
* @param {date} from
* @param {function} callback
*/
Session.prototype.playback = function(callback) {
  var self = this;

  self.client.createToken('GET', '/inboxes', function(err, data) {
    if (err) {
      return callback(err);
    }

    self.client.getInboxes(data.result.token.value, function(err, messages) {
      if (err) {
        return callback(err);
      }

      callback(null, messages, self._purge.bind(self));
    });
  });
};

/**
* Purges the message history from the pod
* #_purge
* @param {function} callback
*/
Session.prototype._purge = function(callback) {
  var self = this;

  if (!callback) {
    callback = function() {};
  }

  self.client.createToken('DELETE', '/inboxes', function(err, data) {
    if (err) {
      return callback(err);
    }

    self.client.purgeInboxes(data.result.token.value, function(err, messages) {
      if (err) {
        return callback(err);
      }

      callback(null);
    });
  });
};

/**
* Resolves the public keys for the given userIDs
* #_getPublicKeys
* @param {array} userIDs
* @param {function} callback
*/
Session.prototype._getPublicKeys = function(userIDs, callback) {
  var self = this;
  var resolvePublicKey = this.client.getPublicKeyForUserID.bind(this);

  async.map(userIDs, resolvePublicKey, function(err, armoredKeys) {
    if (err) {
      return callback(err);
    }

    var keys = armoredKeys.map(function(armoredKey) {
      return pgp.key.readArmored(armoredKey).keys[0];
    });

    callback(null, keys);
  });
};

/**
* Handles connection ready event
* #_onConnect
* @param {object} err
*/
Session.prototype._onConnect = function(err) {
  var self = this;
  var alias = utils.getAliasFromUserID(self._identity.userID);

  if (err) {
    return self.emit('error', err);
  }

  async.series([
    self.client.registerIdentity.bind(self.client),
    self.client.createAlias.bind(self.client, alias)
  ], function(err, alias) {
    if (err) {
      return self.emit('error', err);
    }

    self.emit('ready', alias);
  });
};

/**
* Handles message events from client
* #_onMessage
* @param {object} message
*/
Session.prototype._onMessage = function(message) {
  var self = this;

  self._connection.get(message.key, function(err, value) {
    if (err) {
      return self.emit('error', err);
    }

    self._identity.decrypt(value, function(err, cleartext) {
      if (err) {
        return self.emit('error', err);
      }

      Object.defineProperty(message, 'text', {
        value: cleartext,
        configurable: false,
        enumerable: false
      });

      self.emit('message', message);
    });
  });
};

module.exports = Session;
