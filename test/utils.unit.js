'use strict';

var expect = require('chai').expect;
var utils = require('../lib/utils');

describe('Utilities', function() {

  describe('#getPodHostFromUserID', function() {

    it('should return the pod hostname', function() {
      expect(utils.getPodHostFromUserID('gordon@muttr.me')).to.equal('muttr.me');
    });

  });

  describe('#validateUserID', function() {

    it('should throw if userID contains more than one @ character', function() {
      expect(function() {
        utils.validateUserID('some@sshole@muttr.me');
      }).to.throw(Error, 'userID may only contain a single @ character');
    });

    it('should throw if there is no @ character', function() {
      expect(function() {
        utils.validateUserID('someone');
      }).to.throw(Error, 'userID must contain "@<hostname>"');
    });

    it('should throw if there is no alias before @ character', function() {
      expect(function() {
        utils.validateUserID('@muttr.me');
      }).to.throw(Error, 'userID must have alias before the @ character');
    });

    it('should throw if there is no hostname after @ character', function() {
      expect(function() {
        utils.validateUserID('someone@');
      }).to.throw(Error, 'userID needs pod hostname after @ character');
    });

    it('should validate the userID', function() {
      expect(function() {
        utils.validateUserID('somebody@muttr.me');
      }).to.not.throw(Error);
    });

  });

});
