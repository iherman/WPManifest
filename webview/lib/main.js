'use strict';

/* eslint-env browser */
/* eslint-disable no-alert */

const {
    obtain_manifest,
    Logger,
    fetch_json,
    fetch_html
} = require('../../lib/utils');
const { get_canonical_manifest } = require('../../lib/process');


/**
 * Fetch the JSON-LD manifest from the URL in the `wpm_url` input form, and display it in the
 * relevant `wpm_holder` text box.
 *
 * @async
 */
async function get_wpm(e) {
    try {
        const wpm_url  = e.target.value;
        const wpm_holder = document.getElementById('wpm_holder');
        const data = wpm_holder.dataset;
        const wpm = await fetch_json(wpm_url);
        data.url = wpm_url;
        wpm_holder.value = wpm;
        document.getElementById('canonical_wpm').value = '';
        document.getElementById('pep_url').value = '';
    } catch (err) {
        console.error(`Error in get_pwm: ${err.message}`);
        alert(`Error in get_pwm: ${err.message}`);
    }
}


/**
 * Convert the content of the `wpm_holder` text box and put the result
 * into the `canonical_wpm` text box.
 *
 */
function convert() {
    const logger = new Logger();
    try {
        const wpm_holder = document.getElementById('wpm_holder');
        if (wpm_holder.value !== '') {
            const canonical_wpm = document.getElementById('canonical_wpm');
            const data = wpm_holder.dataset;
            const manifest_data = {
                manifest_text : wpm_holder.value,
                dom           : undefined,
                base          : data.url,
                lang          : '',
                dir           : ''
            };
            const manifest_object = get_canonical_manifest(logger, manifest_data);
            canonical_wpm.value = JSON.stringify(manifest_object, null, 4);
        }
    } catch (err) {
        console.error(`Error in canonicalization: ${err.message} in ${err.lineNumber}`);
        alert(`Error in canonicalization: ${err.message} in ${err.lineNumber}`);
    } finally {
        console.log(logger.toString());
    }
}


/**
 *
 * Event handler to load an manifest from a local file.
 *
 * @param {Object} e - DOM Event object
 */
// eslint-disable-next-line no-unused-vars
function upload_wpm(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
        const wpm_holder = document.getElementById('wpm_holder');
        try {
            JSON.parse(reader.result);
            wpm_holder.value = reader.result;
            wpm_holder.dataset.url = `file:///${file.name}/`;

            document.getElementById('canonical_wpm').value = '';
            document.getElementById('wpm_url').value = '';
            document.getElementById('pep_url').value = '';
        } catch (s) {
            alert(`Invalid JSON file: ${s.toString()}`);
        }
    });
    reader.readAsText(file);
}


/**
 * Fetch the HTML file using the URL in the input form `pep_url`, fetch or extract the manifest following
 * the rules of the WP specification, display that manifest in the text box `wpm_holder`. Then
 * calculate the canonical manifest and display it in `canonical_wpm` text box.
 *
 * @param {Object} e - DOM Event object
 * @async
 */
async function get_pep(e) {
    const logger = new Logger();
    try {
        const pep_url = e.target.value;
        const wpm_holder = document.getElementById('wpm_holder');
        const canonical_wpm = document.getElementById('canonical_wpm');

        const dom = await fetch_html(pep_url);
        const manifest_data = await obtain_manifest(dom);

        wpm_holder.value = manifest_data.manifest_text;

        const manifest_object = get_canonical_manifest(logger, manifest_data);
        canonical_wpm.value = JSON.stringify(manifest_object, null, 4);

        document.getElementById('wpm_url').value = '';
        document.getElementById('pep_url').value = '';
    } catch (err) {
        console.error(`Error in get_pep: ${err.message}`);
        alert(`Error in getting the Primary Entry Page: ${err.message}`);
    } finally {
        console.log(logger.toString());
    }
}

/**
 * Save the canonical manifest as a file.
 *
 * The trick is to collect the data as a blob, and use the blob's URL with a (hidden) `<a>` element
 * with the `download` attribute set.
 *
 */
function save() {
    const canonical_wpm = document.getElementById('canonical_wpm').value;
    if (canonical_wpm && canonical_wpm !== '') {
        // Get hold of the content
        const mBlob = new Blob([canonical_wpm], { type: 'application/ld+json' });
        const mURI = URL.createObjectURL(mBlob);

        const download = document.getElementById('download');
        download.href = mURI;
        download.download = 'Canonical_Manifest.jsonld';
        download.click();
    }
}


// Just a small goody for the home page...
// eslint-disable-next-line no-unused-vars
function printDate() {
    const now = new Date(document.lastModified);
    let textout = now.getDate() + ' ';
    const month = now.getMonth();
    if (month === 0) textout += 'January';
    if (month === 1) textout += 'February';
    if (month === 2) textout += 'March';
    if (month === 3) textout += 'April';
    if (month === 4) textout += 'May';
    if (month === 5) textout += 'June';
    if (month === 6) textout += 'July';
    if (month === 7) textout += 'August';
    if (month === 8) textout += 'September';
    if (month === 9) textout += 'October';
    if (month === 10) textout += 'November';
    if (month === 11) textout += 'December';
    textout += ', ' + now.getFullYear();
    return textout;
}


window.addEventListener('load', () => {
    document.getElementById('date').textContent = printDate();
    document.getElementById('wpm_url').addEventListener('change', get_wpm);
    document.getElementById('pep_url').addEventListener('change', get_pep);
    document.getElementById('canonicalize').addEventListener('click', convert);
    document.getElementById('upload_wpm').addEventListener('change', upload_wpm);
    document.getElementById('save').addEventListener('click', save);
});
