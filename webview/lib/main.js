'use strict';

const { JSDOM }     = require('jsdom');
const fetch         = require('node-fetch');
const contentType   = require('content-type');
const {
    check_url,
    obtain_manifest,
    Logger,
    fetch_json,
    fetch_html
 } = require('../../lib/utils');
const { get_canonical_manifest } = require('../../lib/process');

const json_content_type = 'application/json';
const html_content_type = 'text/html';

/* eslint-env browser */
/**
 * Get Web resource via a fetch. There is a sanity (security) check on the URL to avoid possible security errors.
 *
 * @async
 * @param {string} resource_url - The URL of the resource to be fetched
 * @param {string} content_type - Expected content. Default is JSON (ie, application/json).
 *    Accepted values are HTML, and JSON (including the 'derivatives', ie, application/XXX+json)
 * @return {Promise} encapsulating the body of the resource. The appropriate parsing should be done by the caller
 */
async function fetch_resource(resource_url) {
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
                        const content_type = base_content_type(response.headers.get('content-type'));
                        if (content_type === json_content_type || content_type === html_content_type) {
                            const resource = response.text();
                            resolve({ resource, content_type });
                        } else {
                            reject(new Error('HTML or JSON-LD are expected'));
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

async function get_wpm(e) {
    try {
        const wpm_url  = document.getElementById('wpm_url').value;
        const wpm_holder = document.getElementById('wpm');
        const wpm = await fetch_json(wpm_url);
        wpm_holder.value = wpm;
    } catch (err) {
        console.error(`Error in get_pwm: ${err.message}`);
    }
}

function convert(e) {
    alert("Convert data from text box");
    // const logger = new Logger();
    // try {
    //     const wpm = document.getElementById('wpm');
    //     const data = wpm.dataset;

    //     if (wpm.value !== '') {
    //         const manifest_data = {
    //             manifest_text : wpm.value,
    //             dom           : data.dom === '' ? undefined : data.dom,
    //             base          : data.base,
    //             lang          : data.lang,
    //             dir           : data.dir
    //         };
    //         console.log(data);
    //         const canonical_wpm = document.getElementById('canonical_wpm');
    //         manifest_data.dom = undefined;
    //         const c_manifest_object = get_canonical_manifest(logger, manifest_data);

    //         canonical_wpm.value = JSON.stringify(c_manifest_object, null, 4);
    //     }
    // } catch (err) {
    //     console.log(`Error in canonicalization: ${err.message} in ${err.lineNumber}`);
    // } finally {
    //     console.log(logger.toString());
    // }
}

function upload_wpm(e) {
    alert("Upload a json file and put it into the text")
}

function get_pep(e) {
    alert("Fetch PEP, get the manifest, put it and convert");
}




window.addEventListener('load', (e) => {
    document.getElementById('fetch_wpm').addEventListener('click', get_wpm);
    document.getElementById('upload_wpm').addEventListener('click', upload_wpm);
    document.getElementById('fetch_pep').addEventListener('click', get_pep);
    document.getElementById('canonicalize').addEventListener('click', convert);
});
