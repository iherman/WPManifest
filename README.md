
# Testing the Web Publication Manifest algorithm details.

This is a proof-of-concept implementation of a translation of a [Web Publication Manifest](https://w3c.github.io/wpub/#wp-construction) into the [WebIDL specification](https://w3c.github.io/wpub/#webidl) of the same document. The library produces a WebPublicationManifest class (in Javascript sense) whose getter functions implement the attributes defined in WebIDL.

The implementation is fairly complete; the only pending feature is the Table Of Content, whose exact definition (and, therefore, its translation into WebIDL) is still in flux. The attribute values are checked, if applicable, when setting them, and the results are collected in a separate simple logger. (No exception is raised when an error is met but, rather, the values are not set.)

The core of the implementation are the files in the `lib` folder, with a `main.js` serving as a CLI driver. There are some rudimentary tests in the `tests` folder, but a more systematic set of tests are obviously necessary. The whole environment runs in `node.js`, and can be installed locally via `npm`. See the `package.json` for dependencies.

---

Ivan Herman (ivan@w3.org)
