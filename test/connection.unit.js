'use strict';

var sinon = require('sinon');
var fs = require('fs');
var expect = require('chai').expect;
var pgp = require('openpgp');
var proxyquire = require('proxyquire');
var Connection = require('../lib/connection');
var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');
var Identity = require('../lib/identity');

describe('Connection', function() {

  var identity = new Identity('test@muttr', 'test', {
    publicKey: fs.readFileSync(__dirname + '/data/testkey.pub.asc'),
    privateKey: fs.readFileSync(__dirname + '/data/testkey.asc')
  });

  describe('@constructor', function() {

    it('should create a new instance with the `new` keyword', function() {
      expect(new Connection()).to.be.instanceof(Connection);
    });

    it('should create a new instance without the `new` keyword', function() {
      expect(Connection()).to.be.instanceof(Connection);
    });

    it('should use the default options', function() {
      expect(
        JSON.stringify(Connection().options)
      ).to.equal(
        JSON.stringify(Connection.DEFAULTS)
      );
    });

    it('should override the default options', function() {
      expect(Connection({
        address: '127.0.0.1'
      }).options.address).to.equal('127.0.0.1');
    });

  });

  describe('#_validateMessageKey', function() {

    var connection = Connection();

    it('should throw with invalid key', function(done) {
      identity.encrypt([], 'test', function(err, msg) {
        expect(function() {
          connection._validateMessageKey('test', msg);
        }).to.throw(Error, 'Message key must be the SHA1 hash of the value');
        done();
      });
    });

    it('should throw with invalid pgp message', function() {
      expect(function() {
        connection._validateMessageKey('test', 'test');
      }).to.throw(Error);
    });

    it('should validate the ok key/message', function() {
      identity.encrypt([], 'test', function(err, msg) {
        var key = crypto.createHash('sha1').update(msg).digest(hex);
        connection._validateMessageKey(key, msg);
        done();
      });
    });

  });

  describe('#get', function() {

    var conn = new Connection();
    var msg, key;

    conn.network = { get: function() { } };

    before(function(done) {
      identity.sign('test', function(err, message) {
        identity.encrypt([], message, function(err, result) {
          msg = result;
          key = crypto.createHash('sha1').update(msg).digest('hex');
          done();
        });
      });
    });

    it('should get the value from the dht and validate it', function(done) {
      var _network = sinon.stub(conn.network, 'get', function(key, callback) {
        callback(null, new Buffer(msg, 'ascii').toString('hex'));
      });
      conn.get(key, function(err, value) {
        _network.restore();
        expect(err).to.equal(null);
        expect(value).to.equal(msg);
        done();
      });
    });

    it('should pass an error if the dht has an error', function(done) {
      var _network = sinon.stub(conn.network, 'get', function(key, callback) {
        callback(new Error('Failed'));
      });
      conn.get(key, function(err, value) {
        expect(err.message).to.equal('Failed');
        _network.restore();
        done();
      });
    });

    it('should pass an error if validation fails', function(done) {
      var _network = sinon.stub(conn.network, 'get', function(key, callback) {
        callback(null, 'test');
      });
      conn.get(key, function(err, value) {
        expect(err.message).to.equal('Message key must be the SHA1 hash of the value');
        _network.restore();
        done();
      });
    });

  });

  describe('#put', function() {

    var conn = new Connection();
    var msg, key;

    conn.network = { put: function() { } };

    var _network = sinon.stub(conn.network, 'put', function(key, val, callback) {
      callback(null);
    });

    before(function(done) {
      identity.sign('test', function(err, message) {
        identity.encrypt([], 'test', function(err, result) {
          msg = result;
          key = crypto.createHash('sha1').update(msg).digest('hex');
          done();
        });
      });
    });

    it('should put the value in the dht and validate it', function(done) {
      conn.put(key, msg, function(err) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('should pass an error if validation fails', function(done) {
      conn.put('test', msg, function(err) {
        expect(err.message).to.equal('Message key must be the SHA1 hash of the value');
        done();
      });
    });

    after(function() {
      _network.restore();
    });

  });

  describe('#open', function() {

    var conn = Connection();

    var _forwardPort = sinon.stub(conn, '_forwardPort', function(done) {
      done(null , '127.0.0.1');
    });
    var _joinNetwork = sinon.stub(conn, '_joinNetwork', function(ip, done) {
      done();
    });

    after(function() {
      _forwardPort.restore();
      _joinNetwork.restore();
    });

    it('should call _forwardPort and _joinNetwork', function(done) {
      conn.open(function() {
        expect(conn._forwardPort.callCount).to.equal(1);
        expect(conn._joinNetwork.callCount).to.equal(1);
        done();
      });
    });

    it('should set the callback to the connect event', function(done) {
      conn._forwardPort.restore();
      var _forwardPort = sinon.stub(conn, '_forwardPort', function(done) {});
      conn.open(function() {});
      expect(typeof conn._events.connect).to.equal('function');
      conn._forwardPort.restore();
      done();
    });

    it('should emit an error if the stack fails', function(done) {
      var conn2 = new Connection();
      var _forwardPort = sinon.stub(conn2, '_forwardPort', function(done) {
        done(null, '127.0.0.1');
      });
      var _joinNetwork = sinon.stub(conn2, '_joinNetwork', function(ip, done) {
        done(new Error());
      });
      conn2.on('error', function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
      conn2.open();
    });

  });

  describe('#_forwardPort', function() {

    it('should pass on the default ip if forwardPort is false', function(done) {
      var conn = Connection();
      conn._forwardPort(function(err, ip) {
        expect(ip).to.equal(conn.options.address);
        done();
      });
    });

    it('should pass on the default ip if portMapping fails', function(done) {
      var conn = Connection({ forwardPort: true });
      var _natClient = sinon.stub(conn._natClient, 'portMapping', function(o, d) {
        d(new Error());
      });
      conn._forwardPort(function(err, ip) {
        expect(ip).to.equal(conn.options.address);
        _natClient.restore();
        done();
      });
    });

    it('should pass on the default ip if externalIp fails', function(done) {
      var conn = Connection({ forwardPort: true });
      var _portMapping = sinon.stub(conn._natClient, 'portMapping', function(o, d) {
        d(null);
      });
      var _externalIp = sinon.stub(conn._natClient, 'externalIp', function(d) {
        d(new Error());
      });
      conn._forwardPort(function(err, ip) {
        expect(ip).to.equal(conn.options.address);
        _portMapping.restore();
        _externalIp.restore();
        done();
      });
    });

    it('should pass on the external ip after portMapping', function(done) {
      var conn = Connection({ forwardPort: true });
      var _portMapping = sinon.stub(conn._natClient, 'portMapping', function(o, d) {
        d(null);
      });
      var _externalIp = sinon.stub(conn._natClient, 'externalIp', function(d) {
        d(null, '1.1.1.1');
      });
      conn._forwardPort(function(err, ip) {
        expect(ip).to.equal('1.1.1.1');
        _portMapping.restore();
        _externalIp.restore();
        done();
      });
    });

  });

  describe('#_joinNetwork', function() {

    var KadConnection = proxyquire('../lib/connection', {
      kad: function() {
        return new EventEmitter();
      }
    });

    it('should set options.address to the ip', function(done) {
      var conn = new KadConnection();
      conn._joinNetwork('1.1.1.1', function(err) {
        expect(conn.options.address).to.equal('1.1.1.1');
        done();
      });
      conn.network.emit('connect');
    });

    it('should callback with an error on dht error event', function(done) {
      var conn = new KadConnection();
      conn._joinNetwork('1.1.1.1', function(err) {
        expect(err).to.be.instanceOf(Error);
        done();
      });
      conn.network.emit('error', new Error());
    });

  });

});
