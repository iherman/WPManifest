#!/usr/bin/env node

'use strict';

const url                         = require('url');
const _                           = require('underscore');
const path                        = require('path');

const nav                         = require('./nav');
const { fetch_html, fetch_json }  = require('./io');



// /**
//  * Convert the json to the target manifest
//  *
//  * The changes are not (yet?) defined in the WP document.
//  * What does happen here is to turn all relative URL-s in links
//  * into absolute ones, with the document URL as the base.
//  *
//  * @param {Object} json - the unchecked and unconverted manifest
//  * @returns {Object} - the cleaned up manifest
//  */
// function convert(json, manifest_url) {
//     // the strange idiom for deep cloning of an object...
//     const manifest = JSON.parse(JSON.stringify(json));
//     if (manifest.resources) {
//         manifest.resources.forEach((obj) => {
//             obj.href = url.resolve(manifest_url, obj.href);
//         });
//     }
//     if (manifest.reading_order) {
//         manifest.reading_order.forEach((obj) => {
//             obj.href = url.resolve(manifest_url, obj.href);
//         });
//     }
//     return manifest;
// }


// *
//  * Process the manifest
//  *
//  * @param {string} text - the textual version of the manifest json file
//  * @param {string} manifest_url - the (absolute) URL of the manifest
//  * @param {string} document_url - the (absolute) URL of the starting page
//  * @returns {Object} - JS representation of the manifest

// async function process_manifest(text, manifest_url, document_url) {
//     // Parse the text into json
//     let json = {};
//     try {
//         json = JSON.parse(text);
//     } catch (err) {
//         console.warn(`Syntax error in the manifest at ${manifest_url}: ${err}`);
//         return {};
//     }

//     // See if the json was an object or an array
//     if (_.isArray(json)) {
//         console.warn(`Manifest at ${manifest_url} is an array and not an object`);
//         return {};
//     }

//     // This is a fake entry right now. At some point it may include further processing
//     // on the manifest, possibly checks as well. Not yet part of the spec;
//     const manifest = convert(json, manifest_url);
//     // Get the default reading order
//     manifest.reading_order = await nav.process_default_reading_order(manifest);

//     // That is it
//     return manifest;
// }


// /**
//  * Main processing steps to obtain the manifest
//  *
//  * @param {string} document_url - The URL of the (HTML) primary entry page.
//  * @returns {Object} - JS representation of the manifest
//  */
// async function obtain_manifest_xx(document_url) {
//     try {
//         // This is not part of the official algorithm: getting the DOM of the start up file
//         const top_level = await fetch_html(document_url);
//         // Get the first <link> in document order that has the publication rel value:
//         const manifest_link = top_level.window.document.querySelector('link[rel*="publication"]');
//         const manifest_url  = url.resolve(document_url, manifest_link.href);

//         // Fetching the manifest content as text
//         const text     = await fetch_json(manifest_url);
//         const manifest = await process_manifest(text, manifest_url, document_url);
//         return manifest;
//     } catch (err) {
//         console.warn(`Error occured in ${url}: ${err}`);
//         return {};
//     }
// }



exports.obtain_manifest = async (dom) => {
    try {
        // This is not complete. What we have is a DOM and not necessarily the full HTML DOM (AFAIK). This means
        // that I am not sure things like the language tag or the base value are properly handled. To be checked, though...

        let origin = dom.window.document.location.href;

        // Find the link element that returns the reference to the manifest
        const link = dom.window.document.querySelector('link[rel*="publication"]');
        if (!link) {
            // No manifest reference!
            throw new Error(`No manifest reference found in ${origin}`)
        }
        const ref = link.getAttribute("href");

        // Major branch at this place, depending on whether this is a local reference or not...
        let manifest = {};
        let manifest_text = '';

        if (ref[0] === '#') {
            // The manifest ought to be local in the file
            const script = dom.window.document.querySelector(`script${ref}`);
            if (script) {
                manifest_text = script.text;
            } else {
                throw new Error(`Manifest at ${link.href} not found`);
            }
            console.log(`lang: ${script.lang}`)
            console.log(`dir: ${script.dir}`)
            console.log(`base: ${script.baseURI}`)


        } else {
            // The manifest file must be fetched
            // Note that the 'href' attributes takes care of the possible relative URL-s, which is handy...
            manifest_text = await fetch_json(link.href);
        }
        // process manifest...
        // FOR debug right now!!!!
        manifest = JSON.parse(manifest_text)
        return manifest;
    } catch(err) {
        console.warn(`Something nasty happened... ${err}`)
        return {}
    }
}


