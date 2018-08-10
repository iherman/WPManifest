
# Testing the Web Publication Manifest algorithm details

This is a proof-of-concept implementation, in JavaScript using `node.js`, of the conversion of a [Web Publication Manifest](https://w3c.github.io/wpub/#wp-construction) into an implementation of the [WebIDL interface](https://w3c.github.io/wpub/#webidl). More specifically, The library produces a `WebPublicationManifest` JavaScript class instance whose getter functions implement the attributes defined in WebIDL.

The implementation is fairly complete, the only pending one is the exact specification/implementation of some of the accessibility terms, that are still under discussion. The attribute values are checked, if applicable, when setting them, and the warning/error results are collected in a separate simple logger. (No exception is raised when an error is met but, rather, the values are not set in the final result. Doing that instead of some draconian error handling is closer to the Web style.)

The core of the implementation are the modules in the `lib` folder, and there is a top level `main.js` serving as a CLI test driver. There are some rudimentary tests in the `tests` folder, but a more systematic set of tests are obviously necessary as a future work. The whole environment runs in `node.js`, and it should be possible to install it locally via `npm` (see the `package.json` for dependencies).

When used as a library, the main entry point is `lib/process.js/obtain_manifest()` with one argument: the DOM of the primary entry page (using the [`JSDOM` library](https://www.npmjs.com/package/jsdom)). This function returns an object `{logger, wpm}`, which can be used as follows:

* `logger` has the `warnings` and `errors` attributes to get an array of relevant strings; it also has convenience methods for printing those: `warnings_toString`, `errors_toString`, `toString`, each returning a string.
* `wpm` mimicks the WebIDL interface, meaning that all entries defined in WebIDL are accessible as attributes like, for example, `wpm.name`. In case no value has been set in the manifest, or the value is invalid, the value of `undefined` is returned. In the case of returned values expected as arrays (e.g., authors), invalid entries (e.g., a `Person` without a `name`) are ignored from the returned value; if the returned array was empty, `undefined` is returned instead for consistency.

It is all a first run, I am sure there are bugs or missing features:-)

---

Ivan Herman (ivan@w3.org)
