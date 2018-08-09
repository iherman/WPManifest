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
/* For debug: more human readable printout of a manifest
/* It is not complete for the manifest: e.g., only author and editor              */
/* are understood and the other creators are ignored. Also, only one a11y term    */
/* understood.                                                                    */
/* ------------------------------------------------------------------------------ */
const sp4 = '    ';
const sp8 = '        ';
const sp12 = '            ';
function printoutManifest(manifest) {
    const pr_text = (texts, sp = sp4) => {
        if (texts === undefined) {
            return `${sp}undefined\n`;
        }
        let str = '';
        texts.forEach((item) => {
            str += `${sp}${item.value} (${item.lang})\n`;
        });
        return str;
    };
    const pr_persons = (persons) => {
        if (persons === undefined) return `${sp4}undefined\n`;
        let str = '';
        persons.forEach((item) => {
            if (item.name !== undefined) {
                str += `${sp4}Person/Organization:\n${pr_text(item.name, sp8)}`;
            }
            if (item.id !== undefined) {
                str += `${sp8}identifier:\n${sp12}${item.id}\n`;
            }
            if (item.url !== undefined) {
                str += `${sp8}address:\n${sp12}${item.url}\n`;
            }
        });
        return str;
    };
    const pr_one_link = (item) => {
        if (item === undefined) return `${sp4}undefined\n`;
        let pstr = '';
        if (item.url !== undefined) {
            pstr += `${sp4}URL:\n${sp8}${item.url}\n`;
        }
        if (item.encodingFormat !== undefined) {
            pstr += `${sp8}Media type:\n${sp12}${item.encodingFormat}\n`;
        }
        if (item.rel !== undefined) {
            pstr += `${sp8}rel:\n${sp12}${item.rel.join(', ')}\n`;
        }
        return pstr;
    };

    const pr_links = (links) => {
        if (links === undefined) return `${sp4}undefined\n`;
        let str = '';
        links.forEach((item) => {
            str += pr_one_link(item);
        });
        return str;
    };

    let retval = '';
    retval += `Publication name:\n${pr_text(manifest.name)}`;
    retval += `Publication url:\n    ${manifest.url}\n`;
    retval += `Publication identifier:\n    ${manifest.id}\n`;
    retval += `Date Published:\n    ${manifest.datePublished}\n`;
    retval += `Date Modified:\n    ${manifest.dateModified}\n`;
    retval += `Access Mode:\n    ${manifest.accessMode}\n`;
    retval += `Author(s):\n${pr_persons(manifest.author)}`;
    retval += `Editor(s):\n${pr_persons(manifest.editor)}`;
    retval += `Creator(s):\n${pr_persons(manifest.creator)}`;
    retval += `Reading Order:\n${pr_links(manifest.readingOrder)}`;
    retval += `Resources:\n${pr_links(manifest.resources)}`;
    retval += `Links:\n${pr_links(manifest.links)}`;
    retval += `Privacy Policy:\n${pr_one_link(manifest.privacyPolicy)}`;
    retval += `Accessibility Report:\n${pr_one_link(manifest.accessibilityReport)}`;
    retval += `Cover(s):\n${pr_links(manifest.cover)}`;
    const toc = manifest.toc;
    if (toc === undefined) {
        retval += 'TOC:\n    undefined';
    } else {
        retval += `TOC:\n    ${toc.tagName}`;
    }
    return retval;
}

/* ------------------------------------------------------------------------------ */
//                            Main entry point for testing
/* ------------------------------------------------------------------------------ */

// Set this to your local URL if you want to test locally...
async function main() {
    let final_url = '';
    try {
        // Get the final URL from a CLI (possibly a local file)
        final_url = getURL(process.argv[1], process.argv[2]);
        const top_level   = await fetch_html(final_url);
        const { wpm, logger } = await obtain_manifest(top_level);
        // console.log(JSON.stringify(wpm, null, 4));
        console.log(printoutManifest(wpm));
        console.log('---- Errors/warnings: ----');
        console.log(logger.toString());
    } catch (err) {
        console.log(`${err}`);
    }
}


// Do it!
main();
