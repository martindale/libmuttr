/**
* @module libmuttr
*/

'use strict';

var Client = require('./lib/client');
var DHT = require('./lib/dht');
var Identity = require('./lib/identity');

/**
* Creates and returns a new muttr.Client
* #createClient
* @param {object} options
*/
exports.createClient = function(options) {
  return new Client(options);
};

/**
* Creates and returns a new muttr.DHT
* #createConnection
* @param {object} options
*/
exports.createConnection = function(options) {
  return new DHT(options);
};

/**
* Creates and returns a new muttr.Identity
* #createIdentity
* @param {string} options
*/
exports.createIdentity = Identity.generate;

exports.Client;
exports.DHT;
exports.Identity;
