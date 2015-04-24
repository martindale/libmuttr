'use strict';

var expect = require('chai').expect;
var Identity = require('../lib/identity');
var pgp = require('openpgp');
var async = require('async');

var NUMBITS = 2048;
var PASSPHRASE = 'secret';
var USERID = 'muttr@test';

var identity1;
var identity2;

describe('Identity', function() {

  this.timeout(20000);

  var keypair1;
  var keypair2;

  before(function(done) {
    pgp.generateKeyPair({
      numBits: NUMBITS,
      passphrase: PASSPHRASE,
      userId: USERID
    }).then(function(result) {
      keypair1 = result;
      done();
    }).catch(function(err) {
      done(err);
    });
  });

  describe('@constructor', function() {

    it('should create a new instance with the new keyword', function() {
      identity2 = new Identity(USERID, PASSPHRASE, {
        publicKey: keypair1.publicKeyArmored,
        privateKey: keypair1.privateKeyArmored
      });
      expect(identity2).to.be.instanceOf(Identity);
    });

    it('should create a new instance without the new keyword', function() {
      expect(Identity(USERID, PASSPHRASE, {
        publicKey: keypair1.publicKeyArmored,
        privateKey: keypair1.privateKeyArmored
      })).to.be.instanceOf(Identity);
    });

    it('should throw without a valid userId', function() {
      expect(function() {
        var id = new Identity(null, PASSPHRASE, {
          publicKey: keypair1.publicKeyArmored,
          privateKey: keypair1.privateKeyArmored
        })
      }).to.throw(Error, 'Invalid userID supplied');
    });

    it('should throw without a valid passphrase', function() {
      expect(function() {
        var id = new Identity(USERID, null, {
          publicKey: keypair1.publicKeyArmored,
          privateKey: keypair1.privateKeyArmored
        })
      }).to.throw(Error, 'Invalid passphrase supplied');
    });

    it('should throw with an incorrect passphrase', function() {
      expect(function() {
        var id = new Identity(USERID, 'wrongsecret', {
          publicKey: keypair1.publicKeyArmored,
          privateKey: keypair1.privateKeyArmored
        })
      }).to.throw(Error, 'Failed to decrypt private key');
    });

  });

  describe('Identity#generate', function() {

    this.timeout(20000);

    it('should generate a new key pair and create identity', function(done) {
      Identity.generate('muttr@test3', 'secret', function(err, ident) {
        expect(ident).to.be.instanceOf(Identity);
        identity1 = ident;
        done();
      });
    });

  });

  describe('#encrypt', function() {

    it('should fail without valid keys', function(done) {
      identity1.encrypt('bad key', 'hello world', function(err, msg) {
        expect(err.message).to.equal('Keys must be an array');
        done();
      });
    });

    it('should fail without a valid message', function(done) {
      identity1.encrypt([], {}, function(err, msg) {
        expect(err.message).to.equal('Message must be a string');
        done();
      });
    });

    it('should encrypt the message', function(done) {
      identity1.encrypt([], 'hello world', function(err, msg) {
        expect(err).to.equal(null);
        expect(typeof msg).to.equal('string');
        done();
      });
    });

  });

  describe('#decrypt', function() {

    it('should fail without a valid message', function(done) {
      identity1.decrypt(null, function(err) {
        expect(err.message).to.equal('Message must be a string');
        done();
      });
    });

    it('should decrypt the message', function(done) {
      identity1.encrypt([], 'hello world', function(err, msg) {
        identity1.decrypt(msg, function(err, msg) {
          expect(msg).to.equal('hello world');
          done();
        });
      });
    });

  });

  describe('#sign', function() {

    it('should fail without a valid message', function(done) {
      identity1.sign(null, function(err, msg) {
        expect(err.message).to.equal('Message must be a string');
        done();
      });
    });

    it('should sign the message', function(done) {
      identity1.sign('hello world', function(err, msg) {
        expect(err).to.equal(null);
        expect(typeof msg).to.equal('string');
        done();
      });
    });

  });

  describe('#verify', function() {

    it('should fail without a valid key', function(done) {
      identity1.verify(null, '', function(err, result) {
        expect(err.message).to.equal('Invalid key supplied');
        done();
      });
    });

    it('should fail without a valid message', function(done) {
      identity1.verify(identity1.publicKey, null, function(err, result) {
        expect(err.message).to.equal('Message must be a string');
        done();
      });
    });

    it('should verify the message', function(done) {
      identity1.sign('hello world', function(err, msg) {
        identity1.verify(identity1.publicKey, msg, function(err, result) {
          expect(result).to.equal('hello world');
          done();
        });
      });
    });

  });

  describe('#serialize', function() {

    it('should convert to JSON with only userID and pubkey', function() {
      var expected = JSON.stringify({
        userID: identity1.userID,
        publicKey: identity1._publicKeyArmored
      });
      expect(identity1.serialize()).to.equal(expected);
    });

  });

});
