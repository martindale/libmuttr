LibMuttr
========

[![Build Status](https://travis-ci.org/muttr/libmuttr.svg)](https://travis-ci.org/muttr/libmuttr)


Tools for communicating over the Muttr network.

## Usage

```bash
npm install libmuttr --save
```

```js
var muttr = require('libmuttr');

muttr.createIdentity('gordon@muttr.me', passphrase, function(err, identity) {

  var client = muttr.createClient(identity);
  var connection = muttr.createConnection('muttr.me', 44678);

  connection.on('connect', function() {
    // ready to publish messages to the network
  });

  client.getConversations(function(err, convos) {
    // load conversation pointers from pod
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
