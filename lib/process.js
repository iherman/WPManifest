/**
 * The real top level function to process a manifest
 */

'use strict';

// const { get_attr, Logger, bcppattern } = require('./utils');
const { get_attr, Logger, bcppattern, fetch_html, fetch_json }  = require('./utils');
const { WebPublicationManifest }                                = require('./WebPublicationManifest');


/**
 * Obtain the manifest starting with the DOM of the primary entry page. This function retrieves the manifest (either from a
 * script element of fetching a separate file), and calls out to the "process_manifest" function to make the full conversion.
 *
 * @async
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


/**
 * Process Manifest. It makes some basic checking on the incoming JSON-LD, gets the title of the entry page (if needed) to be used
 * as a "name", and creates the WebPublicatonManifest class instance. It then takes all the incoming properties and calls the
 * corresponding 'setter' methods on the WebPublicatonManifest class instance, when applicable.
 *
 * The function also creates a Logger, used throughout the process, and returned to the caller.
 *
 * @async
 * @param {string} manifest - the manifest text as JSON-LD
 * @param {JSDOM}  dom -  the DOM of the primary entry page
 * @param {string} base - the base URL to be used
 * @param {string} lang - the default language
 * @param {string} dir - the default text direction
 * @return {object}  Object with two entries: a "logger" pointing at logging results (see Logger object in utils.js)
 *  and a "wpm" pointing at a WebPublicationManifest class instance.
 */
async function process_manifest(manifest_text, dom, base, lang = '', dir = '') {
    try {
        const logger = new Logger();
        let manifest_object = {};
        try {
            manifest_object = JSON.parse(manifest_text);
        } catch (err) {
            throw new Error(`(JSON parsing error) ${err.message}`);
        }
        const term_mapping = {
            '@type' : 'type',
            '@id'   : 'id'
        };

        // Pull in the values for lang and dir; these appear when the manifest is embedded
        if (lang && !manifest_object.inLanguage) manifest_object.inLanguage = lang;
        if (dir && !manifest_object.inDirection) manifest_object.inDirection = dir;

        // ------------------------------------------------------------------------
        // Testing the validity of the manifest
        // Check the contexts whether they are the right ones...
        const required_contexts = ['https://schema.org', 'https://www.w3.org/ns/wp-context'];
        if (logger.error(manifest_object['@context'] && Array.isArray(manifest_object['@context'], 'No context has been provided'))) {
            const check_contexts = required_contexts.reduce((previousValue, currentValue, currentIndex) => {
                return previousValue && (manifest_object['@context'][currentIndex] === currentValue);
            }, true);
            logger.error(check_contexts, 'Context references are invalid');
        }

        // Check whether a type has been provided.
        logger.error(manifest_object['@type'], 'No publication type has been provided');

        // This is now left blank; at some point, the JSON schema validation will
        // be used.

        // ------------------------------------------------------------------------
        // Before expansion, the object must be expended to allow the JSON-LD processing
        // to work as expected: base, language, etc.

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
        // The language are values that may influence the
        // final interpretation of the values, we need these as local variables
        let language = '';
        if (manifest_object.inLanguage) {
            const check_lang = bcppattern.test(manifest_object.inLanguage);
            if (check_lang) {
                language = manifest_object.inLanguage;
            } else {
                logger.warning(false, `"${manifest_object.inLanguage}" is not a valid language tag`);
                manifest_object.inLanguage = undefined;
            }
        }

        // Populate the final manifest...
        const wpm = new WebPublicationManifest(logger, base, language);
        const manifest_terms = Object.getOwnPropertyNames(wpm);

        // All method calls are similar: take the value of the manifest, and
        // initialize the value's corresponding value. All the
        // conversion tricks are done in those attribute setters.
        Object.keys(manifest_object).forEach((term) => {
            // Whilst most of the terms are used verbatim, some are not.
            // Also, some should not be mapped.
            if (term !== '@context' && term !== 'toc') {
                const final_term = term_mapping[term] || term;
                if (manifest_terms.includes(`_${final_term}`)) {
                    wpm[final_term] = manifest_object[term];
                }
            }
        });

        //----------------------------------------------------------------
        // Getting hold of the TOC (if any)
        // let toc_resource;
        // 1st step: see if the manifest includes a toc reference
        const toc_reference = wpm._toc_reference;

        // The toc resource is either the primary entry point (ie, 'dom') or has to be fetched to create a DOM for it
        let toc_resource;
        if (toc_reference === undefined) {
            toc_resource = dom;
        } else {
            toc_resource = await fetch_html(toc_reference.url);
        }

        // Try to locate a doc-toc element in the toc resource; if found, set it in the WPM object
        if (logger.warning(toc_resource !== null, 'TOC resource could not be reached or parsed')) {
            // Bingo, there is a dedicated toc resource. The next step is to find the right navigation element.
            const toc = toc_resource.window.document.querySelector('*[role="doc-toc"]');
            if (toc) {
                wpm.toc = toc;
            }
        }

        // That is it...
        return { logger, wpm };
    } catch (err) {
        throw new Error(`(In processing the manifest) ${err.message}`);
    }
}


/* =================================================================================== */

module.exports = { obtain_manifest };
