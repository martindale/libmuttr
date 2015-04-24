/**
* @module libmuttr/utils
*/

'use strict';

var assert = require('assert');

/**
* Validates a userID
* #validateUserID
* @param {string} userID
*/
exports.validateUserID = function(userID) {
  assert(typeof userID === 'string', 'userID must be a string');

  var parts = userID.split('@');

  assert(parts.length !== 1, 'userID must contain "@<hostname>"');
  assert(parts.length === 2, 'userID may only contain a single @ character');
  assert(parts[0].length > 0, 'userID must have alias before the @ character');
  assert(parts[1].length > 0, 'userID needs pod hostname after @ character');
};

/**
* Extracts the pod hostname from a userID
* #getPodHostFromUserID
* @param {string} userID
*/
exports.getPodHostFromUserID = function(userID) {
  exports.validateUserID(userID);

  return userID.split('@')[1];
};
