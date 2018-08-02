#!/usr/bin/env node

'use strict';

const url                              = require('url');
const path                             = require('path');
const { fetch_html, obtain_manifest }  = require('./lib/io');

/* ------------------------------------------------------------------------------ */
//                    Local helper to turn local file names into URL-s...
/* ------------------------------------------------------------------------------ */

/* Localhost setups */
const PORT    = '8001';
const SCHEME  = 'http';
const HOST    = 'localhost';

// Filename for the server root
const top               = '/Users/ivan/W3C/WWW';

// github area as a real directory
const slink_target      = '/Users/ivan/W3C/github/';

// the symbolic link under root to github
const slink_replacement = 'LocalData/github/';


/**
 * Helper function to test stuff locally; this is not necessary for production.
 * The goal is to turn a possible local filename into a localhost URL, so that the
 * rest of the library works only with proper URLs at every step.
 *
 * The setup is a bit tainted with my local setup that also has a symbolic link from
 * my local web server's top to the github area (that is elsewhere on my disc),
 * ie, a separate check is necessary to turn this symbolic link into the proper URL.
 *
 * @param base: the file name of the node.js script running the tests, serving as a base for relative filenames
 * @param arg: the argument denoting the test file
 * @return: URL string
 */
function getURL(base, arg) {
    if (arg === undefined) {
        throw new Error('No argument...');
    } else {
        const parsed_arg = url.parse(arg);
        if (parsed_arg.protocol) {
            // The argument is a proper URL, nothing to do...
            return arg;
        }
        // We've received a file system reference, which must be converted into an appropriate localhost...
        // base is the name of the script itself as called by node.js
        // We need the full path
        const full_path = path.isAbsolute(arg) ? arg : path.join(path.dirname(base), arg);

        if (full_path.startsWith(slink_target === false && full_path.startsWith(top) === false)) {
            throw new Error('Cannot interpret file name...');
        }
        // This is a local file that will be served via localhost...
        // Create the "path" for the test. This may depend on your local setups; mine is a bit
        // complicated because the github directory is symbolically linked from a HTTP path,
        // and this must be taken into account...
        const retval = {
            protocol : SCHEME,
            hostname : HOST,
            port     : PORT !== '' ? PORT : undefined,
            pathname : full_path.startsWith(slink_target)
                ? path.join(slink_replacement, full_path.slice(slink_target.length))
                : full_path.slice(top.length)
        };
        return url.format(retval);
    }
}


/* ------------------------------------------------------------------------------ */
//                            Main entry point for testing
/* ------------------------------------------------------------------------------ */

// Set this to your local URL if you want to test locally...
async function main() {
    let final_url = '';
    try {
        final_url = getURL(process.argv[1], process.argv[2]);
        const top_level       = await fetch_html(final_url);
        const manifestObject  = await obtain_manifest(top_level);
        // console.log(`Accessibility hazard: ${manifestObject.accessibilityHazard}`);
        console.log(JSON.stringify(manifestObject, null, 4));
    } catch (err) {
        console.warn(`Error occured when handling ${final_url}: ${err}`);
    }
}


// Do it!
main();
