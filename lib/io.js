const { JSDOM }     = require("jsdom");
const fetch         = require("node-fetch");
const validUrl      = require("valid-url");
const url           = require("url");
const _             = require("underscore");
const contentType   = require('content-type');

const json_content_type = "application/json";
const html_content_type = "text/html";

/*
 * Fetch an HTML file
 *
 * @param {string} url - URL to be fetched
 * @return {DOM} - DOM tree object for the HTML content; null if something is not correct (and a warning is issued)
 */
exports.fetch_html = async (url) => {
    try {
        let body = await fetch_resource(url, html_content_type);
        retval = new JSDOM(body);
        return retval;
    } catch(err) {
        console.warn(`HTML parsing error in ${url}: ${err}`);
        return null;
    }
}

/*
 * Fetch an JSON file. Note that it is not symmetric not to return the parsed JSON value (as opposed to the HTML fetch), but that
 * is how the processing steps are formulated.
 *
 * @param {string} url - URL to be fetched
 * @return {string} - JSON content; "{}" if something is not correct (and a warning is issued)
 */
exports.fetch_json = async (url) => {
    try {
        let body = await fetch_resource(url, json_content_type);
        return body;
        // return JSON.parse(body);
    } catch(err) {
        // console.warn(`JSON parsing error in ${url}: ${err}`);
        console.warn(`JSON fetch error in ${url}: ${err}`);
        return "{}";
    }
}

/**
 * Get Web resource via a fetch. There is a sanity (security) check on the URL to avoid possible security errors.
 *
 *
 * @param {string} url - The URL of the resource to be fetched
 * @param {string} content_type - Expected content. Default is JSON (ie, application/json). Accepted values are HTML, and JSON (including the 'derivatives', ie, application/XXX+json)
 * @return {Promise} - encapsulating the body of the resource. If the content_type is JSON, this is a JS object; if it is HTML, it is a DOM tree
 */
async function fetch_resource(url, content_type = json_content_type) {
    let base_content_type = (typ) => {
        let [major, minor] = contentType.parse(typ).type.split('/');
        let extras = minor.split('+');
        return extras.length === 1 ? `${major}/${minor}` : `${major}/${extras[1]}`;
    };

    // If there is a problem, an exception is raised
    return new Promise((resolve, reject) => {
        try {
            // An exception is raised if the URL has security/sanity issues.
            url = check_url(url);
            fetch(url)
                .then((response) => {
                    if(response.ok) {
                        if(base_content_type(response.headers.get('content-type')) === content_type) {
                            resolve(response.text());
                        } else {
                            reject(`${media_type} is expected`);
                        }
                    } else {
                        reject(`HTTP response ${response.status}: ${response.statusText}`);
                    }
                })
                .catch((err) => {
                    reject(`Problem accessing ${url}: ${err}`)
                })
        } catch(err) {
            reject(err)
        }
    });
}


/**
* Basic sanity check on the URL.
*
* The function returns a (possibly slightly modified) version of the URL if everything is fine, or a null value if
* the input argument is not a URL (but should be used as a filename)
*
* There might be errors, however, in the case it is a URL. In such cases the function raises an exception; this
* should be caught to end all processing.
*
* The checks are as follows:
*
* 1. Check whether the protocol is http(s). Other protocols are not accepted (actually rejected by fetch, too)
* 2. Run the URL through a valid-url check, which looks at the validity of the URL in terms of characters used, for example
* 3. Check that the port (if specified) is in the allowed range, ie, > 1024
* 4. Don't allow localhost in a CGI answer...
*
* @param {string} address: the URL to be checked.
* @return {string}: the URL itself (which might be slightly improved by the valid-url method) or null this is, in fact, not a URL
* @throws {exception}: if it pretends to be a URL, but it is not acceptable for some reasons.
*/
function check_url(address) {
    let parsed = url.parse(address);
    if( parsed.protocol === null ) {
        // This is not a URl, should be used as a file name
        throw new Error("Invalid URL: no protocol");
    }

    // Check whether we use the right protocol
    if( ["http:", "https:"].includes(parsed.protocol) === false ) {
        throw new Error(`Only http(s) url-s are accepted (${address})`)
    }

    // Run through the URL validator
    let retval = validUrl.isWebUri(address);
    if( retval === undefined ) {
        throw new Error(`The url ${address} isn't valid`)
    }

    // Check the port
    if(parsed.port !== null && parsed.port <= 1024) {
        throw new Error(`Unsafe port number used in ${address} (${parsed.port})`)
    }

	// Don't allow local host in a CGI script...
	// (In Bratt's python script (<http://dev.w3.org/2004/PythonLib-IH/checkremote.py>) this step was much
	// more complex, and has not yet been reproduced here...
    // if( parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" ) {
    //     throw new Error(`Localhost is not accepted in ${address}`)
    // }

    // If we got this far, this is a proper URL, ready to be used.
    return retval;
}
