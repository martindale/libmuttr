LibMuttr
========

Tools for communicating over the Muttr network.

## Basics

Install with NPM.

```bash
npm install libmuttr --save
```

Create a Muttr client and register with a Muttr Pod.

```js
var muttr = require('libmuttr');
var client = muttr.createClient({ host: 'muttr.me' });

client.on('ready', function() {
  var identity = muttr.createIdentity('passphrase');

  client.register({
    alias: 'gordon',
    identity: identity.serialize()
  }, function(err) {
    if (err) {
      return console.error(err);
    }

    console.info('identity registered at muttr.me: %j', identity);
  });
});
```

Send a message to another Muttrer.

```js
client.send(['someone@muttr.me'], 'o hai thar d00d', function(err, info) {
  if (err) {
    return console.error(err);
  }

  console.info('message stored in muttr dht at key: %s', info.hash);
  console.info('message key delivered to recipients: %j', info.recipients);
});
```

Fetch the list of conversations from your Pod.

```js
client.getConversationList(function(err, convos) {
  if (err) {
    return console.error(err);
  }

  console.info(convos);
  /*
    [
      {
        id: '507f1f77bcf86cd799439011',
        participants: ['gordon@muttr.me', 'someone@muttr.me'],
        messageCount: 42
      },
      ...
    ]
  */
});
```

Fetch the messages keys for a conversation from your Pod, load the messages
from the network, then decrypt them.

```js
client.getConversation('507f1f77bcf86cd799439011', function(err, convo) {
  if (err) {
    console.error(err);
  }

  console.info(convo);
  /*
    [
      {
        key: '50bd53162fc1d43e4222b9679567e89619cf6be1',
        timestamp: '2015-04-23T20:28:22.769Z',
        from: 'someone@muttr.me'
      },
      ...
    ]
  */
  async.map(convo, function(msg, done) {
    client.getFromNetwork(msg.key, function(err, value) {
      msg.value = value; // pgp encrpyted message

      done(null, msg);
    });
  }, function(err, populatedConvo) {
    if (err) {
      return console.error(err);
    }

    var cleartextConvo = populatedConvo.map(function(message) {
      return client.identity.decrypt(message.value);
    });

    console.info(cleartextConvo);
    /*
      [
        {
          key: '50bd53162fc1d43e4222b9679567e89619cf6be1',
          value: 'o hai thar, d00d',
          timestamp: '2015-04-23T20:28:22.769Z',
          from: 'someone@muttr.me'
        },
        ...
      ]
    */
  });
});
```
