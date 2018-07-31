/**
 * Separating the fetch functionalities; these may be implemented by a larger environment,
 * in which case the code in this module is unnecessary.
 */

'use strict';

const { JSDOM }     = require('jsdom');
const fetch         = require('node-fetch');
const validUrl      = require('valid-url');
const url           = require('url');
const _             = require('underscore');
const contentType   = require('content-type');

const { process_manifest } = require('./process');

const json_content_type = 'application/json';
const html_content_type = 'text/html';


/**
* Basic sanity check on the URL.
*
* The function returns a (possibly slightly modified) version of the URL if everything is fine, or a null value if
* the input argument is not a URL (but should be used as a filename).
*
* There might be errors, however, in the case it is a URL. In such cases the function raises an exception; this
* should be caught to end all processing.
*
* The checks are as follows:
*
* 1. Check whether the protocol is http(s). Other protocols are not accepted (actually rejected by fetch, too);
* 2. Run the URL through a valid-url check, which looks at the validity of the URL in terms of
*    characters used, for example;
* 3. Check that the port (if specified) is in the allowed range, ie, > 1024;
*
* @param {string} address: the URL to be checked.
* @return {string}: the URL itself (which might be slightly improved by the valid-url method) or null
*    if this is, in fact, not a URL
* @throws {exception}: if it pretends to be a URL, but it is not acceptable for some reasons.
*/
function check_url(address) {
    const parsed = url.parse(address);
    if (parsed.protocol === null) {
        // This is not a URl, should be used as a file name
        throw new Error('Invalid URL: no protocol');
    }

    // Check whether we use the right protocol
    if (['http:', 'https:'].includes(parsed.protocol) === false) {
        throw new Error(`Only http(s) url-s are accepted (${address})`);
    }

    // Run through the URL validator
    const retval = validUrl.isWebUri(address);
    if (retval === undefined) {
        throw new Error(`The url ${address} isn't valid`);
    }

    // Check the port
    if (parsed.port !== null && parsed.port <= 1024) {
        throw new Error(`Unsafe port number used in ${address} (${parsed.port})`);
    }

    // If we got this far, this is a proper URL, ready to be used.
    return retval;
}


/**
 * Get Web resource via a fetch. There is a sanity (security) check on the URL to avoid possible security errors.
 *
 *
 * @param {string} resource_url - The URL of the resource to be fetched
 * @param {string} content_type - Expected content. Default is JSON (ie, application/json).
 *    Accepted values are HTML, and JSON (including the 'derivatives', ie, application/XXX+json)
 * @return {Promise} - encapsulating the body of the resource. The appropriate parsing should be done by the caller
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
};


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
};


async function obtain_manifest(dom) {
    const get_attr = (start, term) => {
        let element = start;
        do {
            if (element[term] !== "") {
                return element[term];
            } else {
                element = element.parentElement
            }
        } while (element !== null);
        return "";
    }

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
        let manifest_text = '';
        if (ref[0] === '#') {
            // The manifest ought to be local in the file
            const script = dom.window.document.querySelector(`script${ref}`);
            if (script) {
                manifest_text = script.text;
            } else {
                throw new Error(`Manifest at ${link.href} not found`);
            }
            return process_manifest(manifest_text, dom, script.baseURI, get_attr(script,"lang"), get_attr(script,"dir"));
        } else {
            // The manifest file must be fetched
            // Note that the 'href' attributes takes care of the possible relative URL-s, which is handy...
            manifest_text = await fetch_json(link.href);
            return process_manifest(manifest_text, dom, link.href);
        }
    } catch(err) {
        console.warn(`Something nasty happened... ${err}`)
        return {}
    }
}

/* =================================================================================== */

module.exports = { check_url, fetch_html, obtain_manifest };

