const url                         = require('url');
const _                           = require('underscore');
const { fetch_html, fetch_json }  = require('./io');


/**
 * Get the reading order from a nav element in an HTML document. See the spec for details
 *
 * @param {DOM.Node} dom - the HTML DOM
 * @param {string} base - the base URL (i.e., the URL of the HTML document)
 * @return {Array of strings} - list of (absolute) URL-s. If no <nav> element is found, returns an empty array
 */
function extract_reading_order(dom, base) {
    // Get the <nav> elements in the document. Note that only the first <nav> element will be used in document order.
    const navs = dom.window.document.getElementsByTagName('nav');
    if (navs.length > 0) {
        // Get all the <a> elements that are children of <nav>
        const refs = _.chain([...navs[0].getElementsByTagName('a')])
        // Get the href value of the <a> element, resolve it against base, and remove the fragment ID
        // Duplicate results should be filtered out, in favor of the first occurence of a value
            .map((x) => x.href)
            .map((x) => url.resolve(base, x))
            .map((x) => {
                const p = url.parse(x);
                p.hash = '';
                // Maybe:
                // p.auth = p.search = ""
                return url.format(p);
            })
            .uniq()
            .value();
        return refs;
    }
    return [];
}


/**
 * Process reading order.
 *
 *
 * @param {Object} manifest - the manifest
 * @returns {Array} - default reading order
 */
exports.process_default_reading_order = async (manifest) => {
    let default_reading_order = [];
    try {
        if (manifest.reading_order) {
            return manifest.reading_order;
        } if (manifest.resources) {
            // Find the navigation document's URL
            const navigation_document = _.find(manifest.resources, (lnk) => lnk.rel.includes('contents'));
            if (navigation_document) {
                // The caller layers already turned any href into absolute URLs by now...
                const navigation_document_dom = await fetch_html(navigation_document.href);
                default_reading_order = extract_reading_order(navigation_document_dom, navigation_document.href);
            }
        }
    } catch (err) {
        console.error(err);
    }
    return default_reading_order;
};
