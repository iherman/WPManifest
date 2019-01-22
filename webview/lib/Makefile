lib = ../../lib
modules = $(lib)/CanonicalManifest.js $(lib)/WebPublicationManifest.js $(lib)/lib/process.js $(lib)/lib/utils.js

../js/wpm.js : main.js $(modules)
	browserify page.js main.js > ../js/wpm.js
	uglifyjs ../js/wpm.js > ../js/wpm.min.js
