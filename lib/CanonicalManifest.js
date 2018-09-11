/**
 * This is the representation of the Web Publication Manifest WebIDL interfaces in Javascript classes.
 *
 * The reason why classes are used, as opposed to objects, it that checking the attributes in the setter
 * method looked like a cleaner code than putting all the checks in the process that make the manifest mapping.
 */

'use strict';

const url                                            = require('url');
const {
    get_attr,
    LogLevel,
    bcppattern
} = require('./utils');

const misc_arrays_properties = [
    'type',
    'name',
    'rel'
];

const a11y_properties = [
    'accessMode',
    'accessModeSufficient',
    'accessibilityAPI',
    'accessibilityControl',
    'accessibilityFeature',
    'accessibilityHazard'
];

const creator_properties = [
    'artist',
    'author',
    'contributor',
    'creator',
    'editor',
    'illustrator',
    'inker',
    'letterer',
    'penciler',
    'publisher',
    'readBy',
    'translator'
];

const resource_categorization_properties = [
    'readingOrder',
    'resources',
    'links'
];

const textual_properties = [
    'accessibilitySummary',
    'name',
    'description'
];

const url_properties = [
    'url',
    'id'
];

const properties_with_objects = creator_properties.concat(resource_categorization_properties);
const array_properties = misc_arrays_properties.concat(a11y_properties.concat(properties_with_objects));

/**
 * Canonicalize the manifest, per draft.
 *
 * @param {Object} logger - logger for errors and warnings.
 * @param {Object} manifest_orig  - the Manifest object (just parsed from JSON)
 * @param {JSDOM}  document -  the DOM Document Note of the primary entry page
 * @param {string} base - the base URL to be used
 * @param {string} lang - the default language
 * @param {string} dir - the default text direction
 * @returns {Object} - the canonical version of the manifest
 */
function canonicalize(logger, manifest_orig, document, base, lang = '', dir = '') {
    let manifest = {};
    let language = '';

    // ------------------ Helper functions -------------------
    /**
     * Helper function: search through the objects contained in arrays, and perform a
     * canonicalization function on the object itself. The helper function finds the
     * top level properties for an array of objects, and performs a 'map' on the array using
     * the callback function.
     *
     * @param {String[]} array - list of properties to handle
     * @param {Function} func - callback function to invoke as part of a 'map' on the array elements
     */
    const canonicalize_objects = (array, func) => {
        array.forEach((prop) => {
            if (manifest[prop]) {
                // the value is an array, by virtue of step 5
                manifest[prop] = manifest[prop].map(func);
            }
        });
    };

    /**
     * Localize a string. If it is already an object, return unchanged, otherwise return a new
     * object with the lange values
     *
     * TODO: check whether it is a real object, if not, raise a warning!!!
     *
     * @param {(Object|string)} str - string or, possibly, already an object
     * @returns {Object} localizable string object
     */
    const localize_string = (str) => {
        if (typeof str === 'string') {
            const retval = {};
            retval.value = str;
            if (language !== '') {
                retval.language = language;
            }
            return retval;
        } else {
            // already an object
            return str;
        }
    };

    // ---------------------------------------------------------------------------
    try {
        // Not sure it is necessary... but it does not touch the original manifest, creates a clone
        // instead.
        manifest = JSON.parse(JSON.stringify(manifest_orig));

        // ---------------------------------------------------------------------
        // Step 1. Pull in the <title> content, if necessary, for a local title
        if (!manifest.name) {
            // See if the primary entry page includes a title
            const title = document.querySelector('title');
            if (title) {
                // The language of the title, if set explicitly in that document
                // must also be taken into account
                const title_lang = get_attr(title, 'lang');
                if (title_lang) {
                    manifest.name = {
                        value    : title.text,
                        language : title_lang
                    };
                } else {
                    manifest.name = title.text;
                }
            }
        }

        // ---------------------------------------------------------------------
        // Step 2 and 3: test language and base direction, if applicable
        if (lang && !manifest.inLanguage) manifest.inLanguage = lang;
        if (dir && !manifest.inDirection) manifest.inDirection = dir;

        // Also store the default language value, it will be necessary later; do also a check on the fly...
        if (manifest.inLanguage) {
            const check_lang = bcppattern.test(manifest.inLanguage);
            if (check_lang) {
                language = manifest.inLanguage;
            } else {
                logger.assert(false, `"${manifest.inLanguage}" is not a valid language tag`, LogLevel.warning);
                manifest.inLanguage = undefined;
            }
        }

        // ---------------------------------------------------------------------
        // Step 4: set default reading order
        if (!manifest.readingOrder) {
            manifest.readingOrder = {
                url: `${document.URL}`
            };
            manifest.readingOrder.type = 'PublicationLink';
        }

        // ---------------------------------------------------------------------
        // Step 5: turn values into arrays when required
        const convert_to_array = (obj) => {
            array_properties.forEach((term) => {
                if (obj[term]) {
                    if (!Array.isArray(obj[term])) {
                        obj[term] = [obj[term]];
                    }
                }
            });
            return obj;
        };
        // Do that on top level and then on the included objects
        convert_to_array(manifest);
        canonicalize_objects(properties_with_objects, (obj) => convert_to_array(obj));

        // ---------------------------------------------------------------------
        // Step 6: all creators should be objects...
        canonicalize_objects(creator_properties, (obj) => {
            if (typeof obj === 'string') {
                const nobj = {};
                nobj.type = ['Person'];
                nobj.name = [obj];
                return nobj;
            } else {
                return obj;
            }
        });

        // ---------------------------------------------------------------------
        // Step 7: links should be objects...
        canonicalize_objects(resource_categorization_properties, (obj) => {
            if (typeof obj === 'string') {
                const nobj = {};
                nobj.type = ['PublicationLink'];
                nobj.url = obj;
                return nobj;
            } else {
                return obj;
            }
        });

        // ---------------------------------------------------------------------
        // Step 8: texts should be canonicalizable
        const localize_text_values = (obj) => {
            textual_properties.forEach((prop) => {
                if (obj[prop]) {
                    if (Array.isArray(obj[prop])) {
                        obj[prop] = obj[prop].map(localize_string);
                    } else {
                        obj[prop] = localize_string(obj[prop]);
                    }
                }
            });
            return obj;
        };
        // Do that on top level and then on the included objects
        localize_text_values(manifest);
        canonicalize_objects(properties_with_objects, (obj) => localize_text_values(obj));

        // ---------------------------------------------------------------------
        // Step 9: absolutize URL-s
        const absolutize_urls = (obj) => {
            url_properties.forEach((prop) => {
                if (obj[prop]) {
                    if (Array.isArray(obj[prop])) {
                        obj[prop] = obj[prop].map((url_value) => url.resolve(base, url_value));
                    } else {
                        obj[prop] = url.resolve(base, obj[prop]);
                    }
                }
            });
            return obj;
        };
        // Do that on top level and then on the included objects
        absolutize_urls(manifest);
        canonicalize_objects(properties_with_objects, (obj) => absolutize_urls(obj));

        return manifest;
    } catch (err) {
        console.log(err);
    }
}


/* =================================================================================== */

module.exports = { canonicalize };
