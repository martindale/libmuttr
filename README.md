Muttr
========

[![Build Status](https://travis-ci.org/muttr/libmuttr.svg)](https://travis-ci.org/muttr/libmuttr)
[![Coverage Status](https://coveralls.io/repos/muttr/libmuttr/badge.svg)](https://coveralls.io/r/muttr/libmuttr)

Tools for communicating over the Muttr network.

## Usage

```bash
npm install muttr --save
```

```js
var muttr = require('muttr');
var identity = new muttr.Identity('gordon@muttr.me', passphrase, pgpKeyPair);
var session = new muttr.Session(identity, { storage: MyStorageAdapter });

session.on('ready', function() {

  var recipients = ['libby@muttr.me', 'ruby@muttr.me'];
  var message = 'hey, let me tell you guys a secret!';

  session.sendMessage(recipients, message, function(err, hash) {
    // store message in the muttr network and notify recipients' pods
  });

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

#### serialize()

Returns a JSON string containing your public key and user ID.

### Class: Client

Acts as an RPC client for communicating with MuttrPods.

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
