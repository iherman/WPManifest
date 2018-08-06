/**
 * Utilities
 */

'use strict';

const validUrl      = require('valid-url');
const url           = require('url');

const bcppattern = RegExp('^(((en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-([A-Za-z]{4}))?(-([A-Za-z]{2}|[0-9]{3}))?(-([A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-([0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(x(-[A-Za-z0-9]{1,8})+))?)|(x(-[A-Za-z0-9]{1,8})+))$');

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
        // This is not a URL, should be used as a file name
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


/*
 * Minor helper function on DOM manipulation: get the value of an attribute by also
 * going up the DOM tree to get a possible inherited value. Typical usage is to find the language
 * of an element.
 *
 * @param {DOM Element Node} start: the element to start with
 * @param {string} term: the attribute name
 * @return {string}: attribute value, '' if not found.
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
 * Helper function: deep clone of an object
 * skipping some keys
 *
 * @param {Array} skippedKeys: keys in target that should be skipped
 * @param {Object} source: source object; the clone is deep, ie, this object can be modified later
 * @param {Object} target: the object the source object should be cloned into.
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
 * Simple logger class to record errors and warnings for subequent display
 */
class Logger {
    constructor() {
        this._warnings = [];
        this._errors = [];
    }

    warning(condition, message) {
        if (condition === false) {
            this._warnings.push(message);
        }
        return condition;
    }

    error(condition, message) {
        if (condition === false) {
            this._errors.push(message);
        }
        return condition;
    }

    get warnings() { return this._warnings; }

    get errors() { return this._errors; }

    errors_toString() {
        return Logger._display(this.errors, 'Errors:');
    }

    warnings_toString() {
        return Logger._display(this.warnings, 'Warnings:');
    }

    toString() {
        return `${this.warnings_toString()}\n${this.errors_toString()}`;
    }

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
    check_url, get_attr, condClone, Logger, bcppattern
};
