/**
 * The real top level function to process a manifest
 */

'use strict';

// const jsonld = require('jsonld');
// const assert = require('assert').strict;

const { get_attr }               = require('./utils');
const { WebPublicationManifest } = require('./WebPublicationManifest');

/**
 * Process Manifest
 *
 * @param {string} manifest : the manifest text as JSON-LD
 * @param {JSDOM}  dom : the DOM of the primary entry page
 * @param {string} base : the base URL to be used
 * @param {string} lang : the default language
 * @param {string} dir : the default text direction
 * @return {object} : the WebPublicationManifest object
 */
async function process_manifest(manifest_text, dom, base, lang = '', dir = '') {
    const manifest_object = JSON.parse(manifest_text);
    const term_mapping = {
        '@type' : 'type',
        '@id'   : 'id'
    };

    // Pull in the values for lang and dir; these appear when the manifest is embedded
    if (lang && !manifest_object.inLanguage) manifest_object.inLanguage = lang;
    if (dir && !manifest_object.inDirection) manifest_object.inDirection = dir;

    // ------------------------------------------------------------------------
    // Testing the validity of the manifest

    // This is now left blank; at some point, the JSON schema validation will
    // be used.

    // ------------------------------------------------------------------------
    // Before expansion, the object must be expended to allow the JSON-LD processing
    // to work as expected: base, language, etc.

    // The language are values that may influence the
    // final interpretation of the values, we need these as local variables
    const language = manifest_object.inLanguage || '';

    // ------------------------------------------------------------------------
    // Pull in the <title> content, if necessary, for a local title
    if (!manifest_object.name) {
        // See if the primary entry page includes a title
        const title = dom.window.document.querySelector('title');
        if (title) {
            // The language of the title, if set explicitly in that document
            // must also be taken into account
            const title_lang = get_attr(title, 'lang');
            if (title_lang) {
                manifest_object.name = {
                    '@value'    : title.text,
                    '@language' : title_lang
                };
            } else {
                manifest_object.name = title.text;
            }
        }
    }

    // ------------------------------------------------------------------------
    // Populate the final manifest...
    const retval = new WebPublicationManifest(base, language);
    const manifest_terms = Object.getOwnPropertyNames(retval);

    // All method calls are similar: take the value of the manifest, and
    // initialize the value's corresponding value. All the
    // conversion tricks are done in those attribute setters.
    Object.keys(manifest_object).forEach((term) => {
        // Whilst most of the terms are used verbatim, some are not.
        // Also, some should not be mapped.
        if (term !== '@context') {
            const final_term = term_mapping[term] || term;
            if (manifest_terms.includes(`_${final_term}`)) {
                retval[final_term] = manifest_object[term];
            }
        }
    });

    // That is it...
    return retval;
}


/* =================================================================================== */

module.exports = { process_manifest };
