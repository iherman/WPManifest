lib = ../../lib
modules = $(lib)/CanonicalManifest.js $(lib)/WebPublicationManifest.js $(lib)/process.js $(lib)/utils.js

../js/wpm.js : main.js $(modules)
	browserify main.js > ../js/wpm.js
	uglifyjs ../js/wpm.js > ../js/wpm.min.js
