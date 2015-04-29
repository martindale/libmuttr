/**
* @module libmuttr/client
*/

'use strict';

var assert = require('assert');
var qs = require('querystring');
var merge = require('merge');
var utils = require('./utils');
var request = require('request');
var Identity = require('./identity');

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
  this.baseUrl = 'https://' + utils.getPodHostFromUserID(this._identity.userID);
  this.pubkey = this.identity._publicKeyArmored;
}

/**
* Register the identity with the target muttrpod
* #registerIdentity
* @param {function} callback
*/
Client.prototype.registerIdentity = function(callback) {
  var self = this;

  this._identity.signClearMessage(self.pubkey, function(err, message) {
    if (err) {
      return callback(err);
    }

    var options = {
      url: self.baseUrl,
      body: message
    };

    request.post(options, self._handleResponse(callback));
  });
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
* Fetch the public key for the given alias
* #searchAliasesInPod
* @param {string} host
* @param {string} text
* @param {function} callback
*/
Client.prototype.searchAliasesInPod = function(host, text, callback) {
  var options = {
    url: 'https://' + host + '/aliases',
    qs: { search: text }
  };

  request.get(options, this._handleResponse(callback));
};

/**
* Ask pod to store message in DHT
* #requestStoreMessage
* @param {string} message
* @param {function} callback
*/
Client.prototype.requestStoreMessage = function(message, callback) {
  request.post({
    url: self.baseUrl + '/messages',
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
  var url = this.baseUrl + '/messages/' + key;

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
  var url = 'https://' + url + '/chats';
  var data = { key: key, alias: alias };

  this._createPayload(url, data, function(err, payload) {
    if (err) {
      return callback(err);
    }

    request.post({ url: url, body: payload }, self._handleResponse(callback));
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
  var url = this.baseUrl + '/aliases';

  this._createPayload(url, { alias: alias }, function(err, payload) {
    if (err) {
      return callback(err);
    }

    request.post({ url: url, body: payload }, self._handleResponse(callback));
  });
};

/**
* Creates a new one time use token for sending GET requests
* #createToken
* @param {function} callback
*/
Client.prototype.createToken = function(callback) {
  var self = this;
  var url = this.baseUrl + '/tokens';

  this._createPayload(url, {}, function(err, payload) {
    if (err) {
      return callback(err);
    }

    request.post({ url: url, body: payload }, self._handleResponse(callback));
  });
};

/**
* Fetch a list of open coversations and their message keys
* #getConversations
* @param {string} token
* @param {function} callback
*/
Client.prototype.getConversations = function(token, callback) {
  var url = this.baseUrl + '/chats';
  var query = { token: token };

  request.get({ url: url, qs: query }, this._handleResponse(callback));
};

/**
* Purge chat history from directory server
* #purgeConversationHistory
* @param {string} token
* @param {function} callback
*/
Client.prototype.purgeConversationHistory = function(token, callback) {
  var url = this.baseUrl + '/chats';
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
  }
};

/**
* Forms a proper request payload from an object
* #_createPayload
* @param {string} url
* @param {object} data
* @param {function} callback
*/
Client.prototype._createPayload = function(url, data, callback) {
  try {
    assert(Object.keys(data).length > 0, 'Invalid data object supplied');
  } catch(err) {
    return callback(err);
  }

  var identity = null;
  var destpod = url.parse(url).host;
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
    identity_type: identityType
  });

  this._identity.signClearMessage(qs.stringify(payload), callback);
};
