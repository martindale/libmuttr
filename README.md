Muttr
========

[![Build Status](https://travis-ci.org/muttr/libmuttr.svg)](https://travis-ci.org/muttr/libmuttr)
[![Coverage Status](https://coveralls.io/repos/muttr/libmuttr/badge.svg)](https://coveralls.io/r/muttr/libmuttr)

Tools for communicating over the Muttr network.

## Usage

Install the Muttr library using NPM.

```bash
npm install muttr --save
```

Import your program's required modules.

```js
var muttr = require('muttr');
var levelup = require('levelup');
```

Load the user's PGP key pair.

```js
var user = new muttr.Identity('user@muttr.me', 'passphrase', {
  privateKey: fs.readFileSync('path/to/private.key.asc'),
  publicKey: fs.readFileSync('path/to/public.key.asc')
});
```

Connect to the P2P Muttr network's DHT.

```js
var network = new muttr.Connection({
  forwardPort: true,
  seeds: [{ address: 'muttr.me', port: 44678 }],
  storage: levelup('path/to/network/storage.db')
});
```

Create a new Session for the user and party!

```js
var app = new muttr.Session(user, network);

// pull any messages missed off the user's pod
app.playback(function(err, messages, purge) {
  console.log('Storing %d missed messages...', messages.length);
  purge(); // delete from remote
});

// now you can send a message to a friend
app.send('friend@muttr.me', 'howdy, partner!', function(err, message) {
  console.log('Message %s sent!', message.key);
});

// and get notified when you receive a message
app.on('message', function(msg) {
  console.log('Message received from %s: %s', msg.sender.userID, msg.text);
});
```

## Reference

### Class: Identity

Represents a username (or "alias") tied to a PGP key pair.

#### Identity.generate(userID, passphrase, callback)

Generates a new PGP key pair, encrypts the private key with your passphrase, and
passes an new `Identity` instance to the callback.

#### encrypt(keys, message, callback)

Encrypts the supplied message to the given public keys and passes the encrypted
message to the callback.

#### decrypt(message, callback)

Decrypts the supplied message to the using your private key and passes decrypted
message to the callback.

#### sign(message, callback)

Signs the given message with your private key and passes it to the callback.

#### verify(key, message, callback)

Verifies the signature on the given message against the given public key and
passes the plaintext message to the callback.

#### getPubKeyHash()

Returns the SHA1 hash of the public key.

#### getPubKeyHref()

Returns the URL for fetching the public key.

#### serialize()

Returns a JSON string containing your public key and user ID.

### Class: Client

Acts as an RPC client for communicating with MuttrPods.

#### registerIdentity(callback)

Registers the identity with it's defined MuttrPod.

#### getPublicKeyForUserID(userID, callback)

Parses the alias and host from the given userID and fetches the public key.

#### requestStoreMessage(message)

Asks the MuttrPod to store message in network on the client's behalf.

#### requestFindMessage(key, callback)

Asks the MuttrPod to retrieve a message from the network on the client's behalf.

#### sendMessageKey(userID, key, callback)

Notify the userID of a stored message for them to retrieve.

#### createAlias(alias, callback)

Registers a new alias the given identity may be associated with.

#### createToken(method, resource, callback)

Create a one-time-use auth token for GET/DELETE requests to the MuttrPod.

#### getInboxes(token, callback)

Get all messages keys by contact from the MuttrPod.

#### purgeInboxes(token, callback)

Delete all message keys from the MuttrPod.

### Class: Connection

Facilitates connection the the Muttr network's DHT.

#### get(key, callback)

Fetches the PGP message from the network by it's hash.

#### set(key, value, callback)

Validates and broadcasts the PGP message across the DHT.

#### open(callback)

Initializes the connection the the DHT.

### Class: Session

Handles Muttr network connection and pod communication.
