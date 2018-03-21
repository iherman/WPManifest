#!/usr/bin/env node
"use strict";

const nav                       = require("./lib/nav");
const {fetch_html, fetch_json}  = require("./lib/io");
const url                       = require("url");
const _                         = require("underscore");


/**
 * Main processing steps to obtain the manifest
 *
 * @param {string} document_url - The URL of the HTML start up file.
 * @returns {Object} - JS representation of the manifest
 */
async function obtain_manifest(document_url) {
    try {
        // This is not part of the official algorithm: getting the DOM of the start up file
        let top_level = await fetch_html(document_url);
        // Get the first <link> in document order that has the publication rel value:
        let manifest_link = top_level.window.document.querySelector('link[rel*="publication"]');
        let manifest_url  = url.resolve(document_url, manifest_link.href);

        // Fetching the manifest content as text
        let text     = await fetch_json(manifest_url);
        let manifest = await process_manifest(text, manifest_url, document_url);
        return manifest;
    } catch(err) {
        console.warn(`Error occured in ${url}: ${err}`);
        return {};
    }
}

/**
 * Process the manifest
 *
 * @param {string} text - the textual version of the manifest json file
 * @param {string} manifest_url - the (absolute) URL of the manifest
 * @param {string} document_url - the (absolute) URL of the startin page
 * @returns {Object} - JS representation of the manifest
 */
async function process_manifest(text, manifest_url, document_url) {
    // Parse the text into json
    let json = {};
    try {
        json = JSON.parse(text);
    } catch(err) {
        console.warn(`Syntax error in the manifest at ${manifest_url}: ${err}`)
        return {};
    }

    // See if the json was an object or an array
    if(_.isArray(json)) {
        console.warn(`Manifest at ${manifest_url} is an array and not an object`);
        return {};
    }

    // This is a fake entry right now. At some point it may include further processing
    // on the manifest, possibly checks as well. Not yet part of the spec;
    let manifest = convert(json, manifest_url);
    // Get the default reading order
    manifest.reading_order  = await nav.process_default_reading_order(manifest)

    // That is it
    return manifest;
}

/**
 * Convert the json to the target manifest
 *
 * The changes are not (yet?) defined in the WP document. What does happen here is to turn all relative URL-s in links
 * into absolute ones, with the document URL as the base.
 *
 * @param {Object} manifest - the unchecked and unconverted manifest
 * @returns {Object} - the cleaned up manifest
 */
 function convert(json, manifest_url) {
    // the strange idiom for deep cloning of an object...
    let manifest = JSON.parse(JSON.stringify(json));
    if(manifest.resources) {
        manifest.resources.forEach((obj) => {
            obj.href = url.resolve(manifest_url, obj.href);
        })
    }
    if(manifest.reading_order) {
        manifest.reading_order.forEach((obj) => {
            obj.href = url.resolve(manifest_url, obj.href);
        })
    }
    return manifest
 }

//---------------------------------------------------------------------------------------------------------------

// Set this to your local URL if you want to test locally...
async function main() {
    let manifest = await obtain_manifest("http://localhost:8001/LocalData/github/WPManifest/test/entry.html");
    console.log(JSON.stringify(manifest,null,2));
}


// Do it!
main();
