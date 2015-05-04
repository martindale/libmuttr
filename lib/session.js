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
var EventEmitter = require('events').EventEmitter;

Session.DEFAULTS = {

};

inherits(Session, EventEmitter);

/**
* Creates a sandbox for Muttr apps by the given identity
* @constructor
* @param {Identity} identity
* @param {Connection} connection
* @param {object} options
* @param {object} options.storage
* @param {function} options.storage.get
* @param {function} options.storage.put
* @param {function} options.storage.del
*/
function Session(identity, connection, options) {
  if (!(this instanceof Session)) {
    return new Session(identity, options);
  }

  assert(identity instanceof Identity, 'Invalid identity supplied');

  this.options = merge(Object.create(Session.DEFAULTS), options);

  this._identity = identity;
  this._connection = connection;
  this._client = new Client(this._identity);

  this._connection.open(this._onConnect.bind(this));
}

/**
* Store message in network and notify the recipients' pods
* #send
* @param {array} recipients
* @param {string} message
* @param {function} callback
*/
Session.prototype.send = function(recipients, message, callback) {

};

/**
* Handles connection ready event
* #_onConnect
* @param {object} err
*/
Session.prototype._onConnect = function(err) {
  if (err) {
    return this.emit('error', err);
  }

  this.emit('ready');
};
