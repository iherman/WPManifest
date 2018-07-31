const url                                         = require('url');
const _                                           = require('underscore');
const { check_url, fetch_html, obtain_manifest }  = require('./io');


/**
 * Process Manifest
 *
 * @param {string} manifest : the manifest text as JSON-LD
 * @param {JSDOM}  dom : the DOM of the primary entry page
 * @param {string} base : the base URL to be used
 * @param {string} lang : the default language
 * @param {string} dir : the default text direction
 * @return {object} : the WebManifest object
 */
function process_manifest(manifest, dom, base, lang = "", dir = "") {
    // console.log(`
    //     @base value: ${base}
    //     language: ${lang}
    //     text direction: ${dir}`
    // );
    const manifest_object = JSON.parse(manifest);
    if (lang && !manifest_object.inLanguage) manifest_object.inLanguage = lang;
    if (dir && !manifest_object.inDirection) manifest_object.inDirection = dir;

    return manifest_object;
}


/* =================================================================================== */

module.exports = { process_manifest }
