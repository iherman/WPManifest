'use strict';

/**
 * Minor Utilities
 */

const { JSDOM }     = require('jsdom');
const fetch         = require('node-fetch');
const contentType   = require('content-type');
const validUrl      = require('valid-url');
const url           = require('url');

const json_content_type = 'application/json';
const html_content_type = 'text/html';

/** Regexp used to check the validity (per BCP47) of a language tag */
// eslint-disable-next-line max-len
const bcppattern = RegExp('^(((en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-([A-Za-z]{4}))?(-([A-Za-z]{2}|[0-9]{3}))?(-([A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-([0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(x(-[A-Za-z0-9]{1,8})+))?)|(x(-[A-Za-z0-9]{1,8})+))$');

/*

^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|
i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|
cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>
([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})
(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}
|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*
(-(?<privateUse>x(-[A-Za-z0-9]{1,8})+))?)|(?<privateUse>x(-[A-Za-z0-9]{1,8})+))$

*/

/**
* Basic sanity check on the URL.
*
* The function returns a (possibly slightly modified) version of the URL if everything is fine, or a null value if
* the input argument is not a URL (but should be used as a filename).
*
* There might be errors, however, in the case it is a URL.
*
* The checks are as follows:
*
* 1. Check whether the protocol is http(s). Other protocols are not accepted (actually rejected by fetch, too);
* 2. Run the URL through a valid-url check, which looks at the validity of the URL in terms of
*    characters used, for example;
* 3. Check that the port (if specified) is in the allowed range, ie, > 1024;
*
* The function can be used in two modes.
* 1. If a logger is defined, it is used to issue an error. This may be used to check the various URL-s in the manifest
* 2. If a logger is not defined (that is the default), an exception is raised. That should be used when the URL is dereferenced.
*
* @param {string} address - the URL to be checked.
* @param {Object} logger - if defined, it is used instead of a an exception
* @returns {string} - the URL itself (which might be slightly improved by the valid-url method) or null if this is, in fact, not a URL;
*  if there is a logger message, it returns null.
* @throws {exception} if it pretends to be a URL, but it is not acceptable for some reasons.
*/
function check_url(address, logger = undefined) {
    const parsed = url.parse(address);
    if (parsed.protocol === null) {
        // This is not a URL, should be used as a file name
        if (logger) {
            logger.assert(false, `"${address}": Invalid URL: no protocol`, LogLevel.error);
            return null;
        }
        throw new Error(`"${address}": Invalid URL: no protocol`);
    }

    // Check whether we use the right protocol
    if (['http:', 'https:'].includes(parsed.protocol) === false) {
        if (logger) {
            logger.assert(false, `"${address}": URL is not dereferencable`, LogLevel.error);
            return null;
        }
        throw new Error(`"${address}": URL is not dereferencable`);
    }

    // Run through the URL validator
    const retval = validUrl.isWebUri(address);
    if (retval === undefined) {
        if (logger) {
            logger.assert(false, `"${address}": the URL isn't valid`, LogLevel.error);
            return null;
        }
        throw new Error(`"${address}": the URL isn't valid`);
    }

    // Check the port
    if (parsed.port !== null && parsed.port <= 1024) {
        if (logger) {
            logger.assert(false, `"${address}": Unsafe port number used in URL (${parsed.port})`, LogLevel.warning);
        } else {
            throw new Error(`"${address}": Unsafe port number used in URL (${parsed.port})`);
        }
    }
    // If we got this far, this is a proper URL, ready to be used.
    return retval;
}


/**
 * Get Web resource via a fetch. There is a sanity (security) check on the URL to avoid possible security errors.
 *
 * @async
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
 * @async
 * @param {string} html_url - URL to be fetched
 * @return {DOM} - DOM tree object for the HTML content; null if something is not correct (and a warning is issued)
 */
async function fetch_html(html_url) {
    try {
        const body = await fetch_resource(html_url, html_content_type);
        const retval = new JSDOM(body, { url: html_url });
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
 * @async
 * @param {string} json_url - URL to be fetched
 * @return {string} - JSON content; "{}" if something is not correct (and a warning is issued)
 */
async function fetch_json(json_url) {
    try {
        const body = await fetch_resource(json_url, json_content_type);
        return body;
    } catch (err) {
        // console.warn(`JSON parsing error in ${json_url}: ${err}`);
        console.warn(`JSON fetch error in ${json_url}: ${err}`);
        return '{}';
    }
}


/*
 * Minor helper function on DOM manipulation: get the value of an attribute by also
 * going up the DOM tree to get a possible inherited value. Typical usage is to find the language
 * of an element.
 *
 * @param {DOMElementNode} start - the element to start with
 * @param {string} term - the attribute name
 * @return {string} attribute value, '' if not found.
 */
function get_attr(start, term) {
    let element = start;
    do {
        if (element[term] !== '') {
            return element[term];
        }
        element = element.parentElement;
    } while (element !== null);
    return '';
}


/**
 * Obtain the manifest starting with the DOM of the primary entry page. This function retrieves the manifest (either from a
 * script element of fetching a separate file), and calls out to the "process_manifest" function to make the full conversion.
 *
 * @async
 * @param {JSDOM} dom - the DOM of the primary entry page
 * @return {Object} - object with entries describing the manifest: `manifest_text`, `base`, `dom`, `lang`, and `dir`.
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
        const manifest_data = {
            manifest_text : '',
            base          : '',
            dom,
            lang          : null,
            dir           : null
        };
        if (ref[0] === '#') {
            // The manifest ought to be local in the file
            const script = dom.window.document.querySelector(`script${ref}`);
            if (script) {
                manifest_data.manifest_text = script.text;
                manifest_data.base = script.baseURI;
                manifest_data.lang = script.getAttribute('lang');
                manifest_data.dir = script.getAttribute('dir');
                // manifest_data.lang = get_attr(script, 'lang');
                // manifest_data.dir = get_attr(script, 'dir');
            } else {
                throw new Error(`Manifest at ${link.href} not found`);
            }
        } else {
            // The manifest file must be fetched
            // Note that the 'href' attributes takes care of the possible relative URL-s, which is handy...
            manifest_data.manifest_text = await fetch_json(link.href);
            manifest_data.base = link.href;
            // manifestObject = process_manifest(manifest_text, dom, link.href);
        }
        return manifest_data;
    } catch (err) {
        console.warn(`Manifest processing error: ${err.message}`);
    }
}


/**
 * Helper function: deep clone of an object
 * skipping some keys
 *
 * @param {string[]} skippedKeys - keys in target that should be skipped
 * @param {Object} source - source object; the clone is deep, ie, this object can be modified later
 * @param {Object} target - the object the source object should be cloned into.
 */
function condClone(skippedKeys, source, target) {
    const cloned_copy = JSON.parse(JSON.stringify(source));

    Object.keys(cloned_copy).forEach((key) => {
        if (!skippedKeys.includes(key)) {
            target[key] = cloned_copy[key];
        }
    });
}


/**
 * Simple logger class to record errors and warnings for subsequent display
 */
const LogLevel = Object.freeze({
    warning : Symbol('warning'),
    error   : Symbol('error')
});
class Logger {
    constructor() {
        this._warnings = [];
        this._errors = [];
    }

    /**
     * Assertion that should lead to a log the message if false.
     *
     * @param {boolean} condition - the condition that decides whether the message should be logged
     * @param {string} message - the message that should be logged, possibly, in case the condition is false
     * @param {Symbol} level - either LogLevel.warning or LogLevel.error
     * @returns {boolean}
     */
    assert(condition, message, level) {
        if (!condition) {
            switch (level) {
                case LogLevel.error:
                    this._errors.push(message);
                    break;
                case LogLevel.warning:
                    this._warnings.push(message);
                    break;
                default:
                    break;
            }
        }
        return condition;
    }

    /**
     * @returns {string[]} all the warnings.
     */
    get warnings() { return this._warnings; }

    /**
     * @returns {string[]} all the errors.
     */
    get errors() { return this._errors; }

    /**
     * Display all the errors as one string.
     *
     * @returns {string}
     */
    errors_toString() {
        return Logger._display(this.errors, 'Errors:');
    }

    /**
     * Display all the warnings as one string.
     *
     * @returns {string}
     */
    warnings_toString() {
        return Logger._display(this.warnings, 'Warnings:');
    }

    /**
     * Display all the messages as one string.
     *
     * @returns {string}
     */
    toString() {
        return `${this.warnings_toString()}\n${this.errors_toString()}`;
    }

    /**
     * Generate a string for a category of messages.
     *
     * @static
     * @param {string[]} messages - set of messages to display.
     * @param {string} start - a text preceding the previous.
     * @returns {string}
     */
    static _display(messages, start) {
        let retval = start;
        if (messages.length === 0) {
            retval += ' none';
        } else {
            messages.forEach((element) => {
                retval += `\n    - ${element}`;
            });
        }
        return retval;
    }
}

/* =================================================================================== */

module.exports = {
    check_url,
    get_attr,
    condClone,
    Logger,
    LogLevel,
    bcppattern,
    fetch_html,
    fetch_json,
    obtain_manifest
};
