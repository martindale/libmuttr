'use strict';

var sinon = require('sinon');
var expect = require('chai').expect;
var fs = require('fs');
var nock = require('nock');
var Identity = require('../lib/identity');
var Client = require('../lib/client');

var identity;

before(function() {
  identity = new Identity('test@muttr', 'test', {
    publicKey: fs.readFileSync(__dirname + '/data/testkey.pub.asc'),
    privateKey: fs.readFileSync(__dirname + '/data/testkey.asc')
  });
});

describe('Client', function() {

  describe('@constructor', function() {

    it('should create an instance with the new keyword', function() {
      expect(new Client(identity)).to.be.instanceOf(Client);
    });

    it('should create an instance without the new keyword', function() {
      expect(Client(identity)).to.be.instanceOf(Client);
    });

    it('should throw given an invalid identity', function() {
      expect(function() {
        var c = new Client({});
      }).to.throw(Error, 'Invalid identity supplied');
    });

  });

  describe('#subscribe', function() {



  });

  describe('#registerIdentity', function() {

    it('should post the signed pubkey', function(done) {
      nock('https://muttr').post('/').reply(200, {
        status: 'success',
        identity: {
          registered: Date.now(),
          pubkeyhash: identity.getPubKeyHash()
        }
      });
      Client(identity).registerIdentity(function(err, result) {
        expect(err).to.equal(null);
        expect(result.identity.pubkeyhash).to.equal(identity.getPubKeyHash());
        done();
      });
    });

    it('should error if signing failed', function(done) {
      var _sign = sinon.stub(identity, 'sign').callsArgWith(1, new Error('Fail'));
      Client(identity).registerIdentity(function(err, result) {
        expect(err.message).to.equal('Fail');
        _sign.restore();
        done();
      });
    });

  });

  describe('#getPublicKeyForUserID', function() {

    it('should request the public key for the user id', function(done) {
      nock('https://muttr').get('/aliases/test').reply(200, identity._publicKeyArmored);
      Client(identity).getPublicKeyForUserID('test@muttr', function(err, pubkey) {
        expect(err).to.equal(null);
        expect(pubkey).to.equal(identity._publicKeyArmored);
        done();
      });
    });

  });

  describe('#requestStoreMessage', function() {

    it('should post the encrypted message', function(done) {
      nock('https://muttr').post('/messages').reply(200, {
        status: 'success',
        key: '1234567890123456789012345678901234567890'
      });
      Client(identity).requestStoreMessage('some msg', function(err, result) {
        expect(err).to.equal(null);
        expect(result.key).to.equal('1234567890123456789012345678901234567890');
        done();
      });
    });

  });

  describe('#requestFindMessage', function() {

    it('should get the message by the key', function(done) {
      nock('https://muttr').get('/messages/somekey').reply(200, 'hello');
      Client(identity).requestFindMessage('somekey', function(err, result) {
        expect(err).to.equal(null);
        expect(result).to.equal('hello');
        done();
      });
    });

  });

  describe('#sendMessageKey', function() {

    it('should post the message key', function(done) {
      nock('https://muttr').post('/inboxes/someone').reply(200, {
        message: {
          recipient: {
            userID: 'someone@muttr',
            pubkeyhash: '1234567890123456789012345678901234567890'
          },
          sender: {
            userID: 'test@muttr',
            pubkeyhash: '1234567890123456789012345678901234567890'
          },
          key: '1234567890123456789012345678901234567890',
          timestamp: Date.now()
        },
        status: 'success'
      });
      Client(identity).sendMessageKey(
        'someone@muttr',
        '1234567890123456789012345678901234567890',
        function(err, result) {
          expect(err).to.equal(null);
          expect(result.message.key).to.equal('1234567890123456789012345678901234567890');
          done();
        }
      );
    });

    it('should error if failed to create payload', function(done) {
      var client = Client(identity);
      var _createPayload = sinon.stub(client, '_createPayload', function(u, d, c) {
        c(new Error('Fail'));
      });
      client.sendMessageKey(
        'someone@muttr',
        '1234567890123456789012345678901234567890',
        function(err, result) {
          _createPayload.restore();
          expect(err.message).to.equal('Fail');
          done();
        }
      );
    });

  });

  describe('#createAlias', function() {

    it('should post the alias name', function(done) {
      nock('https://muttr').post('/aliases').reply(200, {
        alias: {
          created: Date.now(),
          name: 'test2'
        },
        status: 'success'
      });
      Client(identity).createAlias('test2', function(err, result) {
        expect(err).to.equal(null);
        expect(result.alias.name).to.equal('test2');
        done();
      });
    });

    it('should error if failed to create payload', function(done) {
      var client = Client(identity);
      var _createPayload = sinon.stub(client, '_createPayload', function(u, d, c) {
        c(new Error('Fail'));
      });
      client.createAlias('test2', function(err, result) {
        _createPayload.restore();
        expect(err.message).to.equal('Fail');
        done();
      });
    });

  });

  describe('#createToken', function() {

    it('should post to create a token', function(done) {
      nock('https://muttr').post('/tokens').reply(200, {
        token: {
          method: 'GET',
          resource: '/chats',
          issued: Date.now(),
          value: '1234567890'
        },
        status: 'success'
      });
      Client(identity).createToken('GET', '/chats', function(err, result) {
        expect(err).to.equal(null);
        expect(result.token.value).to.equal('1234567890');
        done();
      });
    });

    it('should error if failed to create payload', function(done) {
      var client = Client(identity);
      var _createPayload = sinon.stub(client, '_createPayload', function(u, d, c) {
        c(new Error('Fail'));
      });
      client.createToken('GET', '/chats', function(err, result) {
        _createPayload.restore();
        expect(err.message).to.equal('Fail');
        done();
      });
    });

  });

  describe('#getInboxes', function() {

    it('should get the conversation list using token', function(done) {
      nock('https://muttr').get('/inboxes?token=1234567890').reply(200, {
        status: 'success',
        inboxes: []
      });
      Client(identity).getInboxes('1234567890', function(err, result) {
        expect(err).to.equal(null);
        done();
      });
    });

  });

  describe('#purgeInboxes', function() {

    it('should delete the conversation list using token', function(done) {
      nock('https://muttr').delete('/inboxes?token=1234567890').reply(200, {
        status: 'success',
        inboxes: []
      });
      Client(identity).purgeInboxes('1234567890', function(err, result) {
        expect(err).to.equal(null);
        done();
      });
    });

  });

  describe('#_handleResponse', function() {

    it('should return a function that calls back with error if err', function(done) {
      var handler = Client(identity)._handleResponse(function(err, result) {
        expect(err.message).to.equal('Fail');
        done();
      });
      handler(new Error('Fail'));
    });

    it('should return a function that errors if json=true and cannot parse', function(done) {
      var handler = Client(identity)._handleResponse(function(err, result) {
        expect(err.message).to.equal('Failed to parse response body');
        done();
      });
      handler(null, {}, 'not a json string');
    });

    it('should return a function that errors if bad statusCode', function(done) {
      var handler = Client(identity)._handleResponse(function(err, result) {
        expect(err.message).to.equal('Not Authorized');
        done();
      });
      handler(null, { statusCode: 401 }, '{ "error": "Not Authorized" }');
    });

    it('should return a function that calls back with result', function(done) {
      var handler = Client(identity)._handleResponse(function(err, result) {
        expect(err).to.equal(null);
        expect(result.value).to.equal('hello');
        done();
      });
      handler(null, { statusCode: 200 }, '{ "value": "hello" }');
    });

  });

  describe('#_proxyMessageEvent', function() {



  });

  describe('#_websocketHandshake', function() {



  });

  describe('#_createPayload', function() {

    it('should error if no data supplied', function(done) {
      Client(identity)._createPayload('https://muttr', {}, function(err, data) {
        expect(err.message).to.equal('Invalid data object supplied');
        done();
      });
    });

    it('should use pubkeyhash for identityType', function(done) {
      var _getpkhash = sinon.stub(identity, 'getPubKeyHash');
      Client(identity)._createPayload('https://muttr', { test: true }, function(err, pl) {
        expect(_getpkhash.callCount).to.equal(1);
        _getpkhash.restore();
        done();
      });
    });

    it('should use pubkeyhref for identityType', function(done) {
      var _getpkhref = sinon.stub(identity, 'getPubKeyHref');
      Client(identity)._createPayload('https://notmuttr', { test: true }, function(err, pl) {
        expect(_getpkhref.callCount).to.equal(1);
        _getpkhref.restore();
        done();
      });
    });

  });

});
