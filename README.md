
# Testing the Web Publication Manifest algorithm details

This is a proof-of-concept implementation in `node.js` of a conversion of a [Web Publication Manifest](https://w3c.github.io/wpub/#wp-construction) into an implementation of the [WebIDL specification](https://w3c.github.io/wpub/#webidl) of the same document. More specifically, The library produces a `WebPublicationManifest` class (in the JavaScript sense) whose getter functions implement the attributes defined in WebIDL.

The implementation is fairly complete; the only pending feature is the Table Of Content, whose exact definition (and, therefore, its representation into WebIDL) is still in flux. The attribute values are checked, if applicable, when setting them, and the warning/error results are collected in a separate simple logger. (No exception is raised when an error is met but, rather, the values are not set in the resulting class. Doing that instead of some draconian error handling is closer to the Web style.)

The core of the implementation are the modules in the `lib` folder, and there is a top level `main.js` serving as a CLI driver. There are some rudimentary tests in the `tests` folder, but a more systematic set of tests are obviously necessary as a future work. The whole environment runs in `node.js`, and can be installed locally via `npm`. See the `package.json` for dependencies.

When used as a library, the main entry point is `lib/io.js/obtain_manifest()` with one argument: the DOM of the primary entry page (using the `JSDOM` module in `node.js`). This method returns an object `{logger, wpm}`, with `logger` for all possible warnings and errors, and `wpm` is the embodiment, in a JavaScript class, of the `WebPublicationManifest` WebIDL interface.

---

Ivan Herman (ivan@w3.org)
