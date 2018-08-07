/**
 * This is the representation of the Web Publication Manifest IDL interfaces in Javascript classes.
 *
 * The reason why classes are used, as opposed to objects, it that checking the attributes in the setter
 * method looked like a cleaner code than putting all the checks in the process that make the manifest mapping.
 */

'use strict';

const url                                  = require('url');
const { check_url, condClone, bcppattern } = require('./utils');


/* -------------------------------------- */
/**
 * dictionary LocalizableString {
 *   required DOMString       value;
 *            DOMString       lang;
 * };
 */
class LocalizableString {
    constructor(logger, obj, lang = '') {
        this._value = undefined;
        this._lang = '';
        if (obj instanceof Object) {
            if (logger(obj['@value'] !== undefined, 'String without value')) {
                this._value = obj['@value'];
            } else {
                this._value = undefined;
                this.__invalid = true;
            }
            this._lang = obj['@language'];
            if (!logger.warning(bcppattern.test(this._lang), `"${this._lang}" is not a valid language tag`)) {
                this._lang = '';
            }
        } else {
            this._value = obj;
            this._lang = lang;
        }
    }

    get value() {
        return this._value;
    }

    get lang() {
        return this._lang;
    }

    static initArray(logger, values, lang) {
        const nameArray = Array.isArray(values) ? values : [values];
        const retval = nameArray.map((name) => new LocalizableString(logger, name, lang)).filter((name) => name.__invalid !== true);
        return (retval.length === 0) ? undefined : retval;
    }
}


/* -------------------------------------- */
/**
 * The WebIDL does not contain this interface, only the two
 * extensions below; their structure is, however,
 * identical in the WebIDL, hence this abstract level.
 *
 * The class is abstract insofar as the external users
 * "see" the extension classes only.
 */
class Contributor {
    /**
    * Class can be initialized either by a string (name of the contributor)
    * or an object that contains name and possibly id and url.
    */
    constructor(logger, obj, base, lang) {
        if (obj instanceof Object) {
            // if (logger.error(obj.name !== undefined, 'Invalid contributor: no name provided.')) {
            //     this._name = undefined;
            // } else {
            //     this._name = LocalizableString.initArray(logger, obj.name, lang);
            // }
            if (logger.error(obj.name !== undefined, 'Invalid contributor: no name provided.')) {
                this._name = LocalizableString.initArray(logger, obj.name, lang);
            } else {
                this._name = undefined;
                this.__invalid = true;
            }
            // this._name = LocalizableString.initArray(logger, obj.name, lang);
            this._id = obj['@id'] || undefined;

            if (obj.url) {
                this._url = obj.url;
                check_url(this._url, logger);
            } else {
                this._url = undefined;
            }
            // Copy the rest of the information into "this"; these properties
            // are not defined by the WebIDL, though, but one would think
            // they should not be lost...
            // The strange idiom to deep clone an object...
            condClone(['name', '@id', 'url', '@type'], obj, this);
        } else {
            this._name = [new LocalizableString(logger, obj, lang)];
            this._id = undefined;
            this._url = undefined;
        }
    }

    get name() { return this._name; }

    get id() { return this._id; }

    get url() { return this._url; }

    static initArray(logger, objs, base, lang) {
        const objArray = Array.isArray(objs) ? objs : [objs];
        const retval = objArray.map((obj) => {
            if (obj instanceof Object) {
                const type = obj['@type'] || 'undefined';
                if (type === 'Organization') {
                    return new Organization(logger, obj, base, lang);
                }
                return new Person(logger, obj, base, lang);
            }
            return new Person(logger, obj, base, lang);
        }).filter((contributor) => contributor.__invalid !== true);
        return (retval.length === 0) ? undefined : retval;
    }
}


/**
 * dictionary Person {
 *     required sequence<LocalizableString> name;
 *              DOMString                   id;
 *              DOMString                   url;
 * };
 */
class Person extends Contributor {
    static initArray(logger, values, base, lang) {
        const personArray = Array.isArray(values) ? values : [values];
        const retval = personArray.map((person) => new Person(logger, person, base, lang)).filter((person) => person.__invalid !== true);
        return (retval.length === 0) ? undefined : retval;
    }
}


/**
 * dictionary Organization {
 *     required sequence<LocalizableString> name;
 *              DOMString                   id;
 *              DOMString                   url;
 * };
 */
class Organization extends Contributor {
    static initArray(logger, values, base, lang) {
        const orgArray = Array.isArray(values) ? values : [values];
        const retval = orgArray.map((name) => new Organization(logger, name, base, lang)).filter((org) => org.__invalid !== true);
        return (retval.length === 0) ? undefined : retval;
    }
}


/* -------------------------------------- */
/**
 * enum TextDirection {
 *     "ltr",
 *     "rtl",
 *     "auto"
 * };
 */
const TextDirection = Object.freeze({
    ltr  : Symbol('ltr'),
    rtl  : Symbol('rtl'),
    auto : Symbol('auto')
});


/* -------------------------------------- */
/**
 * enum ProgressionDirection {
 *     "ltr",
 *     "rtl"
 * };
 */
const ProgressionDirection = Object.freeze({
    ltr : Symbol('ltr'),
    rtl : Symbol('rtl')
});


/* -------------------------------------- */
/**
 * dictionary PublicationLink {
 *     required DOMString           url;
 *              DOMString           encodingFormat;
 *              LocalizableString   name;
 *              LocalizableString   description;
 *              sequence<DOMString> rel;
 * };
 */
class PublicationLink {
    constructor(logger, obj, base, lang) {
        if (obj instanceof Object) {
            if (logger.error(obj.url !== undefined, 'Invalid publication link: no URL provided.')) {
                this._url = url.resolve(base, obj.url);
                check_url(this._url, logger);
            } else {
                this._url = undefined;
                this.__invalid = true;
            }

            this._encodingFormat = obj.encodingFormat || undefined;
            this._name = (obj.name) ? new LocalizableString(logger, obj.name, lang) : undefined;
            this._description = (obj.description) ? new LocalizableString(logger, obj.description, lang) : undefined;
            if (obj.rel) {
                this._rel = Array.isArray(obj.rel) ? obj.rel : [obj.rel];
            } else {
                this._rel = undefined;
            }

            // Copy the rest of the information into "this"; these properties
            // are not defined by the WebIDL, though, but one would think
            // they should not be lost...
            // The strange idiom to deep clone an object...
            condClone(['@type', 'url', 'encodingFormat', 'name', 'description', 'rel'], obj, this);
        } else {
            this._url = url.resolve(base, obj);
            this._encodingFormat = undefined;
            this._name = undefined;
            this._description = undefined;
            this._rel = undefined;
        }
    }

    get url() { return this._url; }

    get encodingFormat() { return this._encodingFormat; }

    get name() { return this._name; }

    get description() { return this._description; }

    get rel() { return this._rel; }

    static initArray(logger, values, base, lang) {
        const linkArray = Array.isArray(values) ? values : [values];
        const retval = linkArray.map((name) => new PublicationLink(logger, name, base, lang)).filter((link) => link.__invalid !== true);
        return (retval.length === 0) ? undefined : retval;
    }
}

/* -------------------------------------- */
/*
    Note: the local variables with *one* underscore (eg, _url, _name) etc, though private, are used in the process_manifest function
    in the process.js module to find the relevant setter functions automatically, based on the WPManifest term names. The local variables
    that are really really private are those starting with *two* underscore characters, like __logger, __lang, or __accessibilityReport, do
    _not_ have a setter function (though they may have getters).
*/
class WebPublicationManifest {
    constructor(logger, base, lang) {
        this.__logger = logger;
        this.__base = base;
        this.__lang = lang;
        // These statements are necessary to
        // make the invocation of
        // setters generic
        this._url = undefined;
        this._type = undefined;
        this._accessMode = undefined;
        this._accessModeSufficient = undefined;
        this._accessibilityControl = undefined;
        this._accessibilityAPI = undefined;
        this._accessibilityFeature = undefined;
        this._accessibilityHazard = undefined;
        this._accessibilitySummary = undefined;
        this._id = undefined;
        this._artist = undefined;
        this._author = undefined;
        this._colorist = undefined;
        this._contributor = undefined;
        this._creator = undefined;
        this._editor = undefined;
        this._illustrator = undefined;
        this._letterer = undefined;
        this._penciler = undefined;
        this._publisher = undefined;
        this._readby = undefined;
        this._translator = undefined;
        this._inLanguage = undefined;
        this._inDirection = undefined;
        this._dateModified = undefined;
        this._datePublished = undefined;
        this._readingProgression = ProgressionDirection.ltr;
        this._name = undefined;
        this._readingOrder = [new PublicationLink(base, base, lang)];
        this._resources = undefined;
        this._links = undefined;

        this.__accessibilityReport_searched = false;
        this.__privacyPolicy_searched = false;
        this.__cover_searched = false;
        this.__toc = false;
    }

    // -------------------------------------------------------------------------
    /**
     * Helper function: check whether an accessibility term is valid or not, and produces
     * an array of valid items (or undefined if no valid items are found)
     * @param {string} term: the term for which this check is done (used in the warning message)
     * @param {Array} allowed_terms: list of string terms that are allowed to be used
     * @param {a_mode} item: to be checked
     * @returns {Array}: array of strings or undefined
     */
    __a11yterms(term, allowed_terms, a_mode) {
        const check = (item) => this.__logger.warning(allowed_terms.includes(item), `"${item}" is not a valid term for ${term}`);
        const a_mode_arr = Array.isArray(a_mode) ? a_mode : [a_mode];
        const fva = a_mode_arr.map((item) => (check(item) ? item : null)).filter((item) => item !== null);
        return (fva.length === 0) ? undefined : fva;
    }

    // -------------------------------------------------------------------------
    // The external interface of setter and getter functions...
    // -------------------------------------------------------------------------

    // ****************************
    // --- required DOMString url;
    set url(url_value) {
        this._url = url.resolve(this.__base, url_value);
        check_url(this._url, this.__logger);
    }

    get url() { return this._url; }

    // ****************************
    // --- required DOMString type;
    set type(type) { this._type = type; }

    get type() { return this._type; }


    // ****************************
    // --- sequence<DOMString> accessMode
    set accessMode(a_mode) {
        const terms = ['auditory', 'tactile', 'textual', 'visual',
            'colorDependent', 'chartOnVisual', 'chemOnVisual',
            'diagramOnVisual', 'mathOnVisual', 'musicOnVisual',
            'textOnVisual'
        ];
        this._accessMode = this.__a11yterms('accessMode', terms, a_mode);
    }

    get accessMode() {
        return this._accessMode;
    }

    // ****************************
    // --- sequence<DOMString> accessMode
    set accessModeSufficient(a_mode) {
        const terms = ['auditory', 'tactile', 'textual', 'visual'];
        this._accessModeSufficient = this.__a11yterms('accessModeSufficient', terms, a_mode);
    }

    get accessModeSufficient() {
        return this._accessModeSufficient;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityControl
    set accessibilityControl(a_mode) {
        const terms = ['fullKeyboardControl', 'fullMouseControl', 'fullSwitchControl',
            'fullTouchControl', 'fullVideoControl', 'fullVoiceControl'
        ];
        this._accessibilityControl = this.__a11yterms('accessibilityControl', terms, a_mode);
    }

    get accessibilityControl() {
        return this._accessibilityControl;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityAPI
    set accessibilityAPI(a_mode) {
        const terms = ['AndroidAccessibility', 'ARIA', 'ATK', 'AT-SPI',
            'BlackberryAccessibility', 'iAccessible2', 'iOSAccessibility',
            'JavaAccessibility', 'MacOSXAccessibility', 'MSAA', 'UIAutomation'
        ];
        this._accessibilityAPI = this.__a11yterms('accessibilityAPI', terms, a_mode);
    }

    get accessibilityAPI() {
        return this._accessibilityAPI;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityFeature
    set accessibilityFeature(a_mode) {
        const terms = ['alternativeText', 'annotations', 'audioDescription',
            'bookmarks', 'braille', 'captions', 'ChemML', 'describedMath',
            'displayTransformability', 'highContrastAudio', 'highContrastDisplay',
            'index', 'largePrint', 'latex', 'longDescription', 'MathML', 'none',
            'printPageNumbers', 'readingOrder', 'rubyAnnotations', 'signLanguage',
            'structuralNavigation', 'synchronizedAudioText', 'tableOfContents', 'taggedPDF',
            'tactileGraphic', 'tactileObject', 'timingControl', 'transcript',
            'ttsMarkup', 'unlocked'
        ];
        this._accessibilityFeature = this.__a11yterms('accessibilityFeature', terms, a_mode);
    }

    get accessibilityFeature() {
        return this._accessibilityFeature;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityHazard
    set accessibilityHazard(a_mode) {
        const terms = ['flashing', 'noFlashingHazard', 'motionSimulation',
            'noMotionSimulationHazard', 'sound', 'noSoundHazard',
            'unknown', 'none'
        ];
        this._accessibilityHazard = this.__a11yterms('accessibilityHazard', terms, a_mode);
    }

    get accessibilityHazard() {
        return this._accessibilityHazard;
    }

    // ****************************
    // --- sequence<DOMString> accessibilitySummary
    set accessibilitySummary(a_mode) {
        this._accessibilitySummary = new LocalizableString(this.__logger, a_mode, this.__lang);
    }

    get accessibilitySummary() {
        return this._accessibilitySummary;
    }

    // ****************************
    // --- required DOMString url;
    set id(url_value) {
        this._id = url.resolve(this.__base, url_value);
    }

    get id() {
        return this._id;
    }

    // ****************************
    // --- sequence<Person> artist;
    set artist(value) {
        this._artist = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get artist() {
        return this._artist;
    }

    // ****************************
    // --- sequence<(Person or Organization)> author;
    set author(value) {
        this._author = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get author() {
        return this._author;
    }

    // ****************************
    // --- sequence<Person> colorist;
    set colorist(value) {
        this._colorist = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get colorist() {
        return this._colorist;
    }

    // ****************************
    // --- sequence<(Person or Organization)> contributor;
    set contributor(value) {
        this._contributor = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get contributor() {
        return this._contributor;
    }

    // ****************************
    // --- sequence<(Person or Organization)> creator;
    set creator(value) {
        this._creator = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get creator() {
        return this._creator;
    }

    // ****************************
    // --- sequence<Person> editor;
    set editor(value) {
        this._editor = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get editor() {
        return this._editor;
    }

    // ****************************
    // --- sequence<Person> illustrator;
    set illustrator(value) {
        this._illustrator = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get illustrator() {
        return this._illustrator;
    }

    // ****************************
    // --- sequence<Person> letterer;
    set letterer(value) {
        this._letterer = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get letterer() {
        return this._letterer;
    }

    // ****************************
    // --- sequence<Person> penciler;
    set penciler(value) {
        this._penciler = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get penciler() {
        return this._penciler;
    }

    // ****************************
    // --- sequence<(Person or Organization)> publisher;
    set publisher(value) {
        this._publisher = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get publisher() {
        return this._publisher;
    }

    // ****************************
    // --- sequence<Person> readby;
    set readby(value) {
        this._readby = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get readby() {
        return this._readby;
    }

    // ****************************
    // --- sequence<(Person or Organization)> translator;
    set translator(value) {
        this._translator = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get translator() {
        return this._translator;
    }

    // ****************************
    // --- DOMString inLanguage;
    set inLanguage(value) {
        if (value === undefined) return;
        if (this.__logger.warning(bcppattern.test(value), `"${value}" is not a valid language tag`)) {
            this._inLanguage = value;
        }
    }

    get inLanguage() {
        return this._inLanguage;
    }

    // ****************************
    // --- TextDirection inDirection;
    set inDirection(value) {
        switch (value) {
            case 'ltr':
                this._inDirection = TextDirection.ltr;
                break;
            case 'rtl':
                this._inDirection = TextDirection.rtl;
                break;
            case 'auto':
                this._inDirection = TextDirection.auto;
                break;
            default:
                this.__logger(false, `"${value}" is not a valid text direction tag`);
        }
    }

    get inDirection() {
        return this._inDirection;
    }

    // ****************************
    // --- domString dateModifed;
    set dateModifed(date) {
        this._dateModifed = date;
    }

    get dateModifed() {
        return this._dateModifed;
    }

    // ****************************
    // --- domString datePublished;
    set datePublished(date) {
        this._datePublished = date;
    }

    get datePublished() {
        return this._datePublished;
    }

    // ****************************
    // --- ProgressionDirection readingProgression;
    set readingProgression(value) {
        switch (value) {
            case 'rtr':
                this._readingProgression = ProgressionDirection.rtr;
                break;
            case 'ltr':
                this._readingProgression = ProgressionDirection.ltr;
                break;
            default:
                this.__logger(false, `"${value}" is not a valid reading progression`);
        }
    }

    get readingProgression() {
        return this._readingProgression;
    }

    // ****************************
    // --- sequence<PublicationLink> readingOrder;
    set readingOrder(value) {
        this._readingOrder = PublicationLink.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get readingOrder() {
        return this._readingOrder;
    }

    // ****************************
    // --- sequence<PublicationLink> resources;
    set resources(value) {
        this._resources = PublicationLink.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get resources() {
        return this._resources;
    }

    // ****************************
    // --- sequence<PublicationLink> links;
    set links(value) {
        this._links = PublicationLink.initArray(this.__logger, value, this.__base, this.__lang);
    }

    get links() {
        return this._links;
    }

    // ****************************
    // --- sequence<LocalizableString> name
    set name(names) {
        this._name = LocalizableString.initArray(this.__logger, names, this.__lang);
    }

    get name() {
        return this._name;
    }

    // ****************************
    // --- PublicationLink  accessibilityReport;
    get accessibilityReport() {
        const find_link = (where) => {
            if (where === undefined) {
                return undefined;
            }
            return where.find((item) => item.rel && item.rel.includes('https://www.w3.org/ns/wp#accessibility-report'));
        };

        if (this.__accessibilityReport_searched) {
            return this.__accessibilityReport;
        }
        this.__accessibilityReport_searched = true;
        this.__accessibilityReport = find_link(this._readingOrder)
                                     || find_link(this._resources)
                                     || find_link(this._links);
        return this.__accessibilityReport;
    }

    // ****************************
    // --- PublicationLink privacyPolicy;
    get privacyPolicy() {
        const find_link = (where) => {
            if (where === undefined) {
                return undefined;
            }
            return where.find((item) => item.rel && item.rel.includes('privacy-policy'));
        };

        if (this.__privacyPolicy_searched) {
            return this.__privacyPolicy;
        }
        this.__privacyPolicy_searched = true;
        this.__privacyPolicy = find_link(this._readingOrder) || find_link(this._resources) || find_link(this._links);
        return this.__privacyPolicy;
    }

    // ****************************
    // --- PublicationLink cover;
    get cover() {
        const find_links = (where) => {
            if (where === undefined) {
                return [];
            }
            const retval = where.reduce((all_items, item) => {
                if (item.rel && item.rel.includes('https://www.w3.org/ns/wp#cover')) {
                    all_items.push(item);
                }
                return all_items;
            }, []);
            return retval;
        };

        if (this.__cover_searched) {
            return this.__cover;
        }
        this.__cover_searched = true;
        let covers = find_links(this._readingOrder);
        covers = covers.concat(find_links(this._resources));
        covers = covers.concat(find_links(this._links));
        this.__cover = (covers.length > 0) ? covers : undefined;
        return this.__cover;
    }
}


/* =================================================================================== */

module.exports = { WebPublicationManifest };
