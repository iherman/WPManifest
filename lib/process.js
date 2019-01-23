/**
 * The real top level function to process a manifest
 */

'use strict';

const { Logger, LogLevel, obtain_manifest, calculate_defaults } = require('./utils');
const { WebPublicationManifest } = require('./WebPublicationManifest');
const { canonicalize } = require('./CanonicalManifest');


/**
 * Get the Canonical Manifest. It makes some basic checking on the incoming JSON-LD which is turned into an object before calling out to
 * the relevant `canonicalize` function.
 *
 * @param {Object} logger - logger for errors and warnings.
 * @param {Object} manifest_data - object containing the manifest text, the dom of the primary entry page, the base URL, and the
 * default lang and dir values
 * @return {object}  Object with two entries: a "logger" pointing at logging results (see Logger object in utils.js)
 *  a "wpm" pointing at a WebPublicationManifest class instance and, separately, the canonical manifest.
 */
function get_canonical_manifest(logger, manifest_data) {
    const { manifest_text, dom, base, lang, dir } = manifest_data;
    try {
        let manifest_object = {};
        try {
            manifest_object = JSON.parse(manifest_text);
        } catch (err) {
            logger.assert(true, `(JSON parsing error) ${err.message}`, LogLevel.error);
            throw new Error(`(JSON parsing error) ${err.message}`);
        }

        // ------------------------------------------------------------------------
        // Testing the validity of the manifest
        // Check the contexts whether they are the right ones...
        const required_contexts = ['https://schema.org', 'https://www.w3.org/ns/wp-context'];
        if (logger.assert(manifest_object['@context'] && Array.isArray(manifest_object['@context'], 'No context has been provided', LogLevel.error))) {
            const check_contexts = required_contexts.reduce(
                (previousValue, currentValue, currentIndex) => previousValue && (manifest_object['@context'][currentIndex] === currentValue), true
            );
            logger.assert(check_contexts, 'Context references are invalid', LogLevel.error);
        }

        // ======= A check of the manifest, via ajv, could go here! =======

        //@@@@
        const defaults = calculate_defaults(dom);
        //@@@@

        // Check whether a type has been provided.
        logger.assert(manifest_object.type, 'No publication type has been provided', LogLevel.error);

        if (dom === undefined) {
            return canonicalize(logger, manifest_object, base, undefined, lang, dir);
        } else {
            return canonicalize(logger, manifest_object, base, dom.window.document, lang, dir);
        }
    } catch (err) {
        logger.assert(true, `(In processing the manifest) ${err.message}`, LogLevel.error);
        throw new Error(`(In processing the manifest) ${err.message}`);
    }
}

/**
 * Create the Web Publication Manifest object, populating its attributes using the ones in the canonical manifest.
 * This is done by taking all the incoming properties and calling the
 * corresponding 'setter' methods on the `WebPublicatonManifest` class instance, when applicable.

 * Generate the full WPM Object
 * @param {Object} logger - logger for errors and warnings.
 * @param {Object} canonical_manifest - the full canonical manifest
 * @param {string} base - base URL to be used for relative URL-s.
 * @param {boolean} m_separate - whether the manifest originates from a separate file or is embedded.
*/
function get_wpm(logger, canonical_manifest, base, m_separate) {
    try {
        // Populate the final manifest...
        const wpm = new WebPublicationManifest(logger, base, m_separate);
        const manifest_terms = Object.getOwnPropertyNames(wpm);

        // All method calls are similar: take the value of the manifest, and
        // initialize the value's corresponding value. All the
        // conversion tricks are done in those attribute setters.
        Object.keys(canonical_manifest).forEach((term) => {
            // Whilst most of the terms are used verbatim, some are not.
            // Also, some should not be mapped.
            if (term !== '@context') {
                if (manifest_terms.includes(`_${term}`)) {
                    wpm[term] = canonical_manifest[term];
                }
            }
        });

        // That is it...
        return { wpm, canonical_manifest, logger };
    } catch (err) {
        logger.assert(true, `(In processing the manifest) ${err.message}`, LogLevel.error);
        throw new Error(`(In processing the manifest) ${err.message}`);
    }
}

/**
 * Mostly for testing: using the DOM of an HTML content, return the result of a full processing.
 *
 * @param {JSDOM} dom
 * @return {object}  Object with two entries: a "logger" pointing at logging results (see Logger object in utils.js)
 *  a "wpm" pointing at a WebPublicationManifest class instance and, separately, "canonical_manifest" as a JS object.
*/
async function get_manifest(dom) {
    const logger = new Logger();
    const manifest_data = await obtain_manifest(dom);
    const canonical_manifest = get_canonical_manifest(logger, manifest_data);
    return get_wpm(logger, canonical_manifest, dom.window.document.URL !== manifest_data.base);
}

/* =================================================================================== */

module.exports = { get_manifest, get_canonical_manifest };
