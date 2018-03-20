#!/usr/bin/env node
"use strict";

const nav = require("./lib/nav");

let manifest = {
    // "reading_order" : ["http://www.lo.pikula", "http://www.cin.tanyer"],
    "resources" : [{
        "href": "http://localhost:8001/LocalData/2018/manifest/nav.html",
        "rel":  ["contents"]
    }]
}

async function main() {
    try {
        manifest.reading_order = await nav.getReadingOrder(manifest);
        console.log(manifest);
    } catch(err) {
        console.error(err);
    }
}

// Do it!
main()
