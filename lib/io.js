/**
 * Separating the fetch functionalities; these may be implemented by a larger environment,
 * in which case the code in this module is unnecessary.
 */

'use strict';

const { JSDOM }     = require('jsdom');
const fetch         = require('node-fetch');
const contentType   = require('content-type');

const { process_manifest }    = require('./process');
const { check_url, get_attr } = require('./utils');

const json_content_type = 'application/json';
const html_content_type = 'text/html';


/**
 * Get Web resource via a fetch. There is a sanity (security) check on the URL to avoid possible security errors.
 *
 * @param {string} resource_url - The URL of the resource to be fetched
 * @param {string} content_type - Expected content. Default is JSON (ie, application/json).
 *    Accepted values are HTML, and JSON (including the 'derivatives', ie, application/XXX+json)
 * @return {Promise} encapsulating the body of the resource. The appropriate parsing should be done by the caller
 */
async function fetch_resource(resource_url, content_type = json_content_type) {
    const base_content_type = (typ) => {
        const [major, minor] = contentType.parse(typ).type.split('/');
        const extras = minor.split('+');
        return extras.length === 1 ? `${major}/${minor}` : `${major}/${extras[1]}`;
    };

    // If there is a problem, an exception is raised
    return new Promise((resolve, reject) => {
        // This is a real URL, whose content must be accessed via HTTP(S)
        try {
            // An exception is raised if the URL has security/sanity issues.
            const final_url = check_url(resource_url);
            fetch(final_url)
                .then((response) => {
                    if (response.ok) {
                        if (base_content_type(response.headers.get('content-type')) === content_type) {
                            resolve(response.text());
                        } else {
                            reject(new Error(`${content_type} is expected`));
                        }
                    } else {
                        reject(new Error(`HTTP response ${response.status}: ${response.statusText}`));
                    }
                })
                .catch((err) => {
                    reject(new Error(`Problem accessing ${final_url}: ${err}`));
                });
        } catch (err) {
            reject(err);
        }
    });
}


/*
 * Fetch an HTML file
 *
 * @param {string} html_url - URL to be fetched
 * @return {DOM} - DOM tree object for the HTML content; null if something is not correct (and a warning is issued)
 */
async function fetch_html(html_url) {
    try {
        const body = await fetch_resource(html_url, html_content_type);
        const retval = new JSDOM(body, {
            url: html_url
        });
        return retval;
    } catch (err) {
        console.warn(`HTML parsing error in ${html_url}: ${err}`);
        return null;
    }
}


/*
 * Fetch an JSON file. Note that it is not symmetric, as it does not return the parsed JSON value
 * (as opposed to the HTML fetch), but that is how the processing steps are formulated.
 *
 * @param {string} json_url - URL to be fetched
 * @return {string} - JSON content; "{}" if something is not correct (and a warning is issued)
 */
async function fetch_json(json_url) {
    try {
        const body = await fetch_resource(json_url, json_content_type);
        return body;
        // return JSON.parse(body);
    } catch (err) {
        // console.warn(`JSON parsing error in ${json_url}: ${err}`);
        console.warn(`JSON fetch error in ${json_url}: ${err}`);
        return '{}';
    }
}


/**
 * Obtain the manifest starting with the DOM of the primary entry page. This function retrieves the manifest (either from a
 * script element of fetching a separate file), and calls out to the "process_manifest" function to make the full conversion.
 *
 * @param {JSDOM} dom - the DOM of the primary entry page
 * @return {Object} - object with two entries: a "logger" pointing at logging results (see Logger object in utils.js)
 *  and a "wpm" pointing at a WebPublicationManifest class instance.
 */
async function obtain_manifest(dom) {
    try {
        const origin = dom.window.document.location.href;

        // Find the link element that returns the reference to the manifest
        const link = dom.window.document.querySelector('link[rel*="publication"]');
        if (!link) {
            // No manifest reference!
            throw new Error(`No manifest reference found in ${origin}`);
        }
        const ref = link.getAttribute('href');

        // Major branch at this place, depending on whether this is a local reference or not...
        let manifest_text = '';
        let manifestObject = null;
        if (ref[0] === '#') {
            // The manifest ought to be local in the file
            const script = dom.window.document.querySelector(`script${ref}`);
            if (script) {
                manifest_text = script.text;
            } else {
                throw new Error(`Manifest at ${link.href} not found`);
            }
            manifestObject = await process_manifest(manifest_text, dom, script.baseURI,
                                                    get_attr(script, 'lang'), get_attr(script, 'dir'));
        } else {
            // The manifest file must be fetched
            // Note that the 'href' attributes takes care of the possible relative URL-s, which is handy...
            manifest_text = await fetch_json(link.href);
            manifestObject = await process_manifest(manifest_text, dom, link.href);
        }
        return manifestObject;
    } catch (err) {
        console.warn(`Manifest processing error: ${err.message}`);
    }
}

/* =================================================================================== */

module.exports = { fetch_html, obtain_manifest };
