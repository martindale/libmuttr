'use strict';

var fs = require('fs');
var nock = require('nock');
var sinon = require('sinon');
var expect = require('chai').expect;
var Identity = require('../lib/identity');
var Connection = require('../lib/connection');
var Session = require('../lib/session');

var identity = new Identity('test@muttr', 'test', {
  publicKey: fs.readFileSync(__dirname + '/data/testkey.pub.asc'),
  privateKey: fs.readFileSync(__dirname + '/data/testkey.asc')
});

var connection = new Connection({ port: 0 });

connection.open = function(callback) {
  callback();
};

describe('Session', function() {

  describe('@constructor', function() {

    it('should create an instance without the new keyword', function(done) {
      nock('https://muttr').post('/').reply(200, { identity: { pubkeyhash: '', registered: 1234567 } });
      nock('https://muttr').post('/aliases').reply(200, { alias: { name: 'test' } });
      var session = Session(identity, connection, { subscribe: false });
      session.on('ready', function() {
        expect(session).to.be.instanceOf(Session);
        done();
      });
    });

  });

  describe('#send', function() {



  });

  describe('#playback', function() {



  });

  describe('#_purge', function() {



  });

  describe('#_getPublicKeys', function() {



  });

  describe('#_onConnect', function() {



  });

  describe('#_onMessage', function() {



  });

});
