/**
* @module libmuttr/client
*/

'use strict';

var assert = require('assert');
var qs = require('querystring');
var url = require('url');
var merge = require('merge');
var utils = require('./utils');
var request = require('request');
var WSocket = require('ws');
var Identity = require('./identity');
var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;

inherits(Client, EventEmitter);

/**
* HTTPS API Client for MuttrPods
* @constructor
* @param {object} identity
*/
function Client(identity) {
  if (!(this instanceof Client)) {
    return new Client(identity);
  }

  assert(identity instanceof Identity, 'Invalid identity supplied');

  this._identity = identity;
  this._podhost = utils.getPodHostFromUserID(this._identity.userID);
  this._baseUrl = 'https://' + this._podhost;
  this._pubkey = this._identity._publicKeyArmored;
}

/**
* Open WebSocket connection to pod
* #subscribe
*/
Client.prototype.subscribe = function() {
  this._websocket = new WSocket('wss://' + this._podhost);

  this._websocket.on('open', this._websocketHandshake.bind(this));
  this._websocket.on('message', this._proxyMessageEvent.bind(this));

  return this;
};

/**
* Register the identity with the target muttrpod
* #registerIdentity
* @param {function} callback
*/
Client.prototype.registerIdentity = function(callback) {
  var options = {
    url: this._baseUrl,
    body: this._pubkey
  };

  request.post(options, this._handleResponse(callback));
};

/**
* Fetch the public key for the given alias
* #getPublicKeyForUserID
* @param {string} userID
* @param {function} callback
*/
Client.prototype.getPublicKeyForUserID = function(userID, callback) {
  var host = utils.getPodHostFromUserID(userID);
  var alias = utils.getAliasFromUserID(userID);
  var href = 'https://' + host + '/aliases/' + alias;

  request.get(href, this._handleResponse(callback, { json: false }));
};

/**
* Ask pod to store message in DHT
* #requestStoreMessage
* @param {string} message
* @param {function} callback
*/
Client.prototype.requestStoreMessage = function(message, callback) {
  request.post({
    url: this._baseUrl + '/messages',
    body: message
  }, this._handleResponse(callback));
};

/**
* Ask pod to fetch message from DHT
* #requestFindMessage
* @param {string} key
* @param {function} callback
*/
Client.prototype.requestFindMessage = function(key, callback) {
  var url = this._baseUrl + '/messages/' + key;

  request.get(url, this._handleResponse(callback, { json: false }));
};

/**
* Posts a message reference to the recipient's pod
* #sendMessageKey
* @param {string} userID
* @param {string} key
* @param {function} callback
*/
Client.prototype.sendMessageKey = function(userID, key, callback) {
  var self = this;
  var alias = utils.getAliasFromUserID(userID);
  var podhost = utils.getPodHostFromUserID(userID);
  var url = 'https://' + podhost + '/inboxes/' + alias;
  var data = { key: key, from: this._identity.userID };

  this._createPayload(url, data, function(err, payload) {
    if (err) {
      return callback(err);
    }

    request.post({
      url: url,
      body: payload
    }, self._handleResponse(callback));
  });
};

/**
* Creates a new alias to associate with this identity
* #createAlias
* @param {string} alias
* @param {function} callback
*/
Client.prototype.createAlias = function(alias, callback) {
  var self = this;
  var url = this._baseUrl + '/aliases';

  this._createPayload(url, { alias: alias }, function(err, payload) {
    if (err) {
      return callback(err);
    }

    request.post({
      url: url,
      body: payload
    }, self._handleResponse(callback));
  });
};

/**
* Creates a new one time use token for sending GET requests
* #createToken
* @param {string} method
* @param {string} resource
* @param {function} callback
*/
Client.prototype.createToken = function(method, resource, callback) {
  var self = this;
  var url = this._baseUrl + '/tokens';
  var body = { method: method, resource: resource };

  this._createPayload(url, body, function(err, payload) {
    if (err) {
      return callback(err);
    }

    request.post({
      url: url,
      body: payload
    }, self._handleResponse(callback));
  });
};

/**
* Fetch a list of open coversations and their message keys
* #getInboxes
* @param {string} token
* @param {function} callback
*/
Client.prototype.getInboxes = function(token, callback) {
  var url = this._baseUrl + '/inboxes';
  var query = { token: token };

  request.get({ url: url, qs: query }, this._handleResponse(callback));
};

/**
* Purge chat history from directory server
* #purgeInboxes
* @param {string} token
* @param {function} callback
*/
Client.prototype.purgeInboxes = function(token, callback) {
  var url = this._baseUrl + '/inboxes';
  var query = { token: token };

  request.del({ url: url, qs: query }, this._handleResponse(callback));
};

/**
* Wraps request callback with base error handling
* #_handleResponse
* @param {function} callback
*/
Client.prototype._handleResponse = function(callback, options) {
  var opts = merge({ json: true }, options);

  return function(err, res, body) {
    if (err) {
      return callback(err);
    }

    try {
      body = JSON.parse(body);
    } catch(err) {
      if (opts.json) {
        return callback(new Error('Failed to parse response body'));
      }
    }

    if (res.statusCode !== 200) {
      return callback(new Error(body.error));
    }

    callback(null, body);
  };
};

/**
* Initialize handshake with websockets server
* #_websocketHandshake
*/
Client.prototype._websocketHandshake = function() {
  var self = this;

  this._createPayload(this._baseUrl, {}, function(err, message) {
    if (err) {
      return self.emit('error', err);
    }

    var handshake = new Buffer(message, 'ascii').toString('hex');

    self._websocket.send(handshake, function ack(err) {
      if (err) {
        return self.emit('error', err);
      }
    });
  });
};

/**
* Passes message event through to self parsed as JSON
* #_proxyMessageEvent
* @param {string} data
*/
Client.prototype._proxyMessageEvent = function(data) {
  var message;

  try {
    message = JSON.parse(data);
  } catch(err) {
    return this.emit('error', new Error('Failed to parse incoming message'));
  }

  this.emit('message', message);
};

/**
* Forms a proper request payload from an object
* #_createPayload
* @param {string} url
* @param {object} data
* @param {function} callback
*/
Client.prototype._createPayload = function(uri, data, callback) {
  var identity = null;
  var destpod = url.parse(uri).host;
  var homepod = utils.getPodHostFromUserID(this._identity.userID);
  var identityType = (homepod === destpod) ? 'pubkeyhash' : 'href';

  if (identityType === 'pubkeyhash') {
    identity = this._identity.getPubKeyHash();
  } else {
    identity = this._identity.getPubKeyHref();
  }

  var payload = merge(data, {
    nonce: Date.now(),
    identity: identity,
    identityType: identityType
  });

  this._identity.sign(qs.stringify(payload), callback);
};

module.exports = Client;
