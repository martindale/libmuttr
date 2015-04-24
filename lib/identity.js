/**
* @module libmuttr/identity
*/

'use strict';

var assert = require('assert');
var pgp = require('openpgp');

/**
* An identity is represented by a PGP key pair and user ID
* @constructor
* @param {string} userID
* @param {string} passphrase
* @param {object} keyPair
* @param {string} keyPair.publicKey
* @param {string} keyPair.privateKey
*/
function Identity(userID, passphrase, keyPair) {
  if (!(this instanceof Identity)) {
    return new Identity(userID, passphrase, keyPair);
  }

  assert(typeof userID === 'string', 'Invalid userID supplied');
  assert(typeof passphrase === 'string', 'Invalid passphrase supplied');

  this._publicKeyArmored = keyPair.publicKey;
  this._privateKeyArmored = keyPair.privateKey;

  this.userID = userID;
  this.publicKey = pgp.key.readArmored(keyPair.publicKey).keys[0];
  this.privateKey = pgp.key.readArmored(keyPair.privateKey).keys[0];

  assert(this.privateKey.decrypt(passphrase), 'Failed to decrypt private key');
}

/**
* Decrypts a PGP message
* #decrypt
* @param {string} message
* @param {function} callback
*/
Identity.prototype.decrypt = function(message, callback) {
  try {
    assert(typeof message === 'string', 'Message must be a string');
  } catch(err) {
    return callback(err);
  }

  var msg = pgp.message.readArmored(message);

  pgp.decryptMessage(this.privateKey, msg).then(function(result) {
    callback(null, result);
  }).catch(callback);
};

/**
* Encrypts a PGP message
* #encrypt
* @param {array} keys
* @param {string} message
* @param {function} callback
*/
Identity.prototype.encrypt = function(keys, message, callback) {
  try {
    assert(Array.isArray(keys), 'Keys must be an array');
    assert(typeof message === 'string', 'Message must be a string');
  } catch(err) {
    return callback(err);
  }

  keys.push(this.privateKey); // include our own key

  pgp.encryptMessage(keys, message).then(function(result) {
    callback(null, result);
  }).catch(callback);
};

/**
* Signs a PGP message
* #sign
* @param {string} message
* @param {function} callback
*/
Identity.prototype.sign = function(message, callback) {
  try {
    assert(typeof message === 'string', 'Message must be a string');
  } catch(err) {
    return callback(err);
  }

  pgp.signClearMessage(this.privateKey, message).then(function(result) {
    callback(null, result);
  }).catch(callback);
};

/**
* Verifies PGP signature
* #verify
* @param {object} key
* @param {string} message
* @param {function} callback
*/
Identity.prototype.verify = function(key, message, callback) {
  try {
    assert(key, 'Invalid key supplied');
    assert(typeof message === 'string', 'Message must be a string');
  } catch(err) {
    return callback(err);
  }

  var msg = pgp.cleartext.readArmored(message);

  pgp.verifyClearSignedMessage(key, msg).then(function(result) {
    callback(null, result.text);
  }).catch(callback);
};

/**
* Serializes userId and publicKey as JSON
* #serialize
*/
Identity.prototype.serialize = function() {
  return JSON.stringify({
    userID: this.userID,
    publicKey: this._publicKeyArmored
  });
};

/**
* Generates a new PGP keypair and passes an Identity instance to the callback
* Identity#generate
* @param {string} userID
* @param {string} passphrase
* @param {function} callback
*/
Identity.generate = function(userID, passphrase, callback) {
  var options = {
    numBits: 2048,
    userId: userID,
    passphrase: passphrase
  };

  pgp.generateKeyPair(options).then(createIdentity).catch(callback);

  function createIdentity(keypair) {
    var identity = new Identity(userID, passphrase, {
      publicKey: keypair.publicKeyArmored,
      privateKey: keypair.privateKeyArmored
    });

    callback(null, identity);
  }
};

module.exports = Identity;
