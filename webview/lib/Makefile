lib = ../../lib
modules = $(lib)/CanonicalManifest.js $(lib)/WebPublicationManifest.js $(lib)/process.js $(lib)/utils.js $(lib)/profiles.js

../js/wpm.js : main.js $(modules)
	browserify main.js > ../js/wpm.js
	terser ../js/wpm.js > ../js/wpm.min.js
