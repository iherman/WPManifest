const url                       = require("url");
const _                         = require("underscore");
const {fetch_html, fetch_json}  = require("./io");

exports.getReadingOrder = async (manifest) => {
    let default_reading_order = [];
    try {
        if(manifest.reading_order) {
            return manifest.reading_order;
        } else if(manifest.resources) {
            // Find the navigation document's URL
            let navigation_document = _.find(manifest.resources, (lnk) => {
                return value_or_array_check(lnk.rel,"contents")
            });
            if(navigation_document) {
                let navigation_document_dom = await fetch_html(navigation_document.href);
                default_reading_order = extract_reading_order(navigation_document_dom, navigation_document.href);
            }
        }
    } catch(err) {
        console.error(err);
    }
    return default_reading_order;
}


/**
 * Get value from either a string or an array of strings...
 */
function value_or_array_check(obj, value) {
    if(typeof(obj) === 'string') {
        return obj === value;
    } else if(_.isArray(obj)) {
        return obj.includes(value);
    } else {
        return false;
    }
}

/**
 * Get the reading order from a nav element in an HTML document. See the spec for details
 *
 * @param {DOM.Node} dom - the HTML DOM
 * @param {string} base - the base URL (i.e., the URL of the HTML document)
 * @return {Array of strings} - list of (absolute) URL-s. If no <nav> element is found, returns an empty array
 */
function extract_reading_order(dom, base) {
    // Get the <nav> elements in the document. Note that only the first <nav> element will be used in document order.
    let navs = dom.window.document.getElementsByTagName('nav');
    if(navs.length > 0) {
        // Get all the <a> elements that are children of <nav>
        let refs = _.chain([...navs[0].getElementsByTagName('a')])
                   // Get the href value of the <a> element, resolve it against base, and remove the fragment ID
                   // Duplicate results should be filtered out, in favor of the first occurence of a value
                   .map((x) => x.href)
                   .map((x) => url.resolve(base,x))
                   .map((x) => {
                       let p = url.parse(x);
                       p.hash = ""
                       return url.format(p);
                   })
                   .uniq()
                   .value();
        return refs;
    } else {
        return [];
    }
}
