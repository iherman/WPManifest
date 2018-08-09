/**
 * This is the representation of the Web Publication Manifest WebIDL interfaces in Javascript classes.
 *
 * The reason why classes are used, as opposed to objects, it that checking the attributes in the setter
 * method looked like a cleaner code than putting all the checks in the process that make the manifest mapping.
 */

'use strict';

const url                                            = require('url');
const moment                                         = require('moment');
const {
    check_url,
    condClone,
    bcppattern,
    LogLevel
} = require('./utils');


/* -------------------------------------- */
/**
 * Class representing a Localizable String. The interface is based on the following WebIDL:
 *
 * <pre><code>
 * dictionary LocalizableString {
 *   required DOMString       value;
 *            DOMString       lang;
 * };
 * </code></pre>
 */
class LocalizableString {
    /**
     * Create a new LocalizableString. The class is set to be "invalid" (by setting this.__invalid = true) if no value is provided; such
     * classes are removed from the final reposonses.
     *
     * @param {Object} logger - logger for errors and warnings.
     * @param {Object|string} obj - either a plain string or an object with '@value' and '@language'. Corresponds to the JSON-LD.
     * @param {string} lang - language tag.
     */
    constructor(logger, obj, lang = '') {
        this._value = undefined;
        this._lang = '';
        if (obj instanceof Object) {
            if (logger.assert(obj['@value'] !== undefined, 'String without value', LogLevel.error)) {
                this._value = obj['@value'];
            } else {
                this._value = undefined;
                this.__invalid = true;
            }
            this._lang = obj['@language'];
            if (!logger.assert(bcppattern.test(this._lang), `"${this._lang}" is not a valid language tag`, LogLevel.warning)) {
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

    /**
     * Generate an array of LocalizableString objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or literal objects.
     * @param {string} lang - default language tag.
     * @returns {LocalizableString[]} value is "undefined" if none of the values are legitimate.
     */
    static initArray(logger, values, lang) {
        const nameArray = Array.isArray(values) ? values : [values];
        const retval = nameArray.map((name) => new LocalizableString(logger, name, lang)).filter((name) => name.__invalid !== true);
        return (retval.length === 0) ? undefined : retval;
    }
}


/* -------------------------------------- */
/**
 * Common class for contributors, parent of Person or Organization.
 *
 * The class is abstract insofar as the external users
 * "see" the extension classes only.
 */
class Contributor {
    /**
     * Create a new Contributor. The class is set to be "invalid" (by setting this.__invalid = true) if no name is provided; such
     * classes are removed from the final reposonses.
     *
     * @param {Object} logger - logger for errors and warnings.
     * @param {Object|string} obj - name of the contributor, or an object with at least a "name" property, possibly "url" and "id".
     * @param {string} base - base URL to be used for relative URL-s.
     * @param {string} lang - default language tag.
     */
    constructor(logger, obj, base, lang) {
        if (obj instanceof Object) {
            if (logger.assert(obj.name !== undefined, 'Invalid contributor: no name provided.', LogLevel.error)) {
                this._name = LocalizableString.initArray(logger, obj.name, lang);
            } else {
                this._name = undefined;
                this.__invalid = true;
            }
            // this._name = LocalizableString.initArray(logger, obj.name, lang);
            this._id = obj['@id'] || undefined;

            if (obj.url) {
                this._url = url.resolve(base, obj.url);
                check_url(this._url, logger);
            } else {
                this._url = undefined;
            }

            if (obj['@type']) {
                this._type = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
                logger.assert(this._type.includes('Person') || this._type.includes('Organization'),
                              `Invalid type for a contributor (${this._type})`,
                              LogLevel.warning);
            } else {
                this._type = undefined;
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
            this._type = 'Person';
        }
    }

    get name() { return this._name; }

    get id() { return this._id; }

    get url() { return this._url; }

    /**
     * Generate an array of Contributor objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or Contributor objects.
     * @param {string} lang - default language tag.
     * @returns {(Person|Organization)[]}  value is "undefined" if none of the values are legitimate.
     */
    static initArray(logger, objs, base, lang) {
        const objArray = Array.isArray(objs) ? objs : [objs];
        const retval = objArray.map((obj) => {
            if (obj instanceof Object) {
                const type = obj['@type'] || undefined;
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
 * Class representing a Person. The interface is based on the following WebIDL:
 *
 * <pre><code>
 * dictionary Person {
 *     required sequence<LocalizableString> name;
 *              DOMString                   id;
 *              DOMString                   url;
 * };
 * </code></pre>
 *
 * @extends Collaborator
 */
class Person extends Contributor {
    /**
     * Generate an array of Contributor objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or Person objects.
     * @param {atring} lang - default language tag.
     * @returns {Person[]}  value is "undefined" if none of the values are legitimate.
     */
    static initArray(logger, values, base, lang) {
        const personArray = Array.isArray(values) ? values : [values];
        let retval = personArray.map((person) => new Person(logger, person, base, lang)).filter((person) => person.__invalid !== true);
        // We also have to check whether these objects are all persons; there are terms for which this is an extra constraint!
        retval = retval.filter((item) => logger.assert(item._type.includes('Person'),
                                                       `Only a "Person" object is allowed in this position (${item._name[0].value})`,
                                                       LogLevel.error));
        return (retval.length === 0) ? undefined : retval;
    }
}


/**
 * Class representing an Organization. The interface is based on the following WebIDL:
 *
* <pre><code>
 * dictionary Organization {
 *     required sequence<LocalizableString> name;
 *              DOMString                   id;
 *              DOMString                   url;
 * };
 * </code></pre>
 *
 * @extends Collaborator
 */
class Organization extends Contributor {
    /**
     * Generate an array of Contributor objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or Organization objects.
     * @param {string} lang - default language tag.
     * @returns {Organization[]}  value is "undefined" if none of the values are legitimate.
     */
    static initArray(logger, values, base, lang) {
        const orgArray = Array.isArray(values) ? values : [values];
        let retval = orgArray.map((name) => new Organization(logger, name, base, lang)).filter((org) => org.__invalid !== true);
        retval = retval.filter((item) => logger.assert(item._type.includes('Organization'),
                                                       `Only an "Organization" object is allowed in this position (${item._name[0].value})`, LogLevel.error));
        return (retval.length === 0) ? undefined : retval;
    }
}


/* -------------------------------------- */
/**
 * Enumeration representing a text direction. The interface is based on the following WebIDL:
 *
 * <pre><code>
 * enum TextDirection {
 *     "ltr",
 *     "rtl",
 *     "auto"
 * };
 * </code></pre>
 */
const TextDirection = Object.freeze({
    ltr  : Symbol('ltr'),
    rtl  : Symbol('rtl'),
    auto : Symbol('auto')
});


/* -------------------------------------- */
/**
 * Enumeration representing a reading progression direction. The interface is based on the following WebIDL:
 *
 * <pre><code>
 * enum ProgressionDirection {
 *     "ltr",
 *     "rtl"
 * };
 * </code></pre>
 */
const ProgressionDirection = Object.freeze({
    ltr : Symbol('ltr'),
    rtl : Symbol('rtl')
});


/* -------------------------------------- */
/**
 * Class representing an Publication Link. The interface is based on the following WebIDL:
 * <pre><code>
 * dictionary PublicationLink {
 *     required DOMString           url;
 *              DOMString           encodingFormat;
 *              LocalizableString   name;
 *              LocalizableString   description;
 *              sequence<DOMString> rel;
 * };
 * </code></pre>
 */
class PublicationLink {
    /**
     * Create a new PublicationLink. The class is set to be "invalid" (by setting this.__invalid = true) if no url is provided; such
     * classes are removed from the final reposonses.
      *
     * @param {Object} logger - logger for errors and warnings.
     * @param {Object|string} obj - URL as a string, or an object with at least a "url" property, possibly
     * "encodingFormat", "name", "description", and "rel".
     * @param {string} base - base URL to be used for relative URL-s.
     * @param {string} lang - default language tag.
     */
    constructor(logger, obj, base, lang) {
        if (obj instanceof Object) {
            if (logger.assert(obj.url !== undefined, 'Invalid publication link: no URL provided.', LogLevel.error)) {
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

    /**
     * Generate an array of Contributor objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or PublicationLink objects.
     * @param {string} lang - default language tag.
     * @returns {PublicationLink[]}  value is "undefined" if none of the values are legitimate.
     */
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
/**
 * A full Web Publication Manifest. It implements (via a bunch of setter and getter functions) the attributes defined through WebIDL.
 * (The documentation of each setter/getter pair includes the relevant portion of the WebIDL specification).
 */
class WebPublicationManifest {
    /**
     * Create a new WebPublicationManifest.
     *
     * @param {Object} logger - logger for errors and warnings.
     * @param {string} base - base URL to be used for relative URL-s.
     * @param {string} lang - default language tag.
     */
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
        this._toc = undefined;

        this.__accessibilityReport_searched = false;
        this.__privacyPolicy_searched = false;
        this.__cover_searched = false;
        this.__toc_link_searched = false;
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
        const check = (item) => this.__logger.assert(allowed_terms.includes(item), `"${item}" is not a valid term for ${term}`, LogLevel.warning);
        const a_mode_arr = Array.isArray(a_mode) ? a_mode : [a_mode];
        const fva = a_mode_arr.map((item) => (check(item) ? item : null)).filter((item) => item !== null);
        return (fva.length === 0) ? undefined : fva;
    }

    /**
     * Helper function: find a publication link items with a specific rel value.
     *
     * @static
     * @param {PublicationLink[]} where - the array where to locate a link
     * @param {string} rel_value - the relevant rel value
     * @returns {PublicationLink} returns 'undefined' if not found
     */
    static __find_link(where, rel_value) {
        if (where === undefined) {
            return undefined;
        }
        return where.find((item) => item.rel && item.rel.includes(rel_value));
    }

    // -------------------------------------------------------------------------
    // The external interface of setter and getter functions...
    // -------------------------------------------------------------------------

    // ****************************
    /**
     * URL of the publication.
     * @param {string} url
     */
    set url(url_value) {
        this._url = url.resolve(this.__base, url_value);
        check_url(this._url, this.__logger);
    }

    /**
     *
     * <code>required DOMString url;</code>
     *
     * @returns {string}
     */
    get url() { return this._url; }

    // ****************************
    /**
     * Type of the publication.
     * @param {string} type
     */
    set type(type) { this._type = Array.isArray(type) ? type : [type]; }

    /**
     *
     * <code>required DOMString type;</code>
     *
     * @returns {string}
     */
    get type() { return this._type; }

    // ****************************
    /**
     * Access mode.
     * @param {(string|string[])} a_mode
     */
    set accessMode(a_mode) {
        const terms = ['auditory', 'tactile', 'textual', 'visual',
            'colorDependent', 'chartOnVisual', 'chemOnVisual',
            'diagramOnVisual', 'mathOnVisual', 'musicOnVisual',
            'textOnVisual'
        ];
        this._accessMode = this.__a11yterms('accessMode', terms, a_mode);
    }

    /**
     *
     * <code>required <sequence>DOMString accessMode;</code>
     *
     * @returns {string[]}
     */
    get accessMode() {
        return this._accessMode;
    }

    // ****************************
    /**
     * accessModeSufficient.
     * @param {(string|string[])} a_mode
     */
    set accessModeSufficient(a_mode) {
        const terms = ['auditory', 'tactile', 'textual', 'visual'];
        this._accessModeSufficient = this.__a11yterms('accessModeSufficient', terms, a_mode);
    }

    /**
     *
     * <code>required <sequence>DOMString accessModeSufficient;</code>
     *
     * @returns {string[]}
     */
    get accessModeSufficient() {
        return this._accessModeSufficient;
    }

    // ****************************
    /**
     * accessibilityControl.
     * @param {(string|string[])} a_mode
     */
    set accessibilityControl(a_mode) {
        const terms = ['fullKeyboardControl', 'fullMouseControl', 'fullSwitchControl',
            'fullTouchControl', 'fullVideoControl', 'fullVoiceControl'
        ];
        this._accessibilityControl = this.__a11yterms('accessibilityControl', terms, a_mode);
    }

    /**
     *
     * <code>required <sequence>DOMString accessibilityControl;</code>
     *
     * @returns {string[]}
     */
    get accessibilityControl() {
        return this._accessibilityControl;
    }

    // ****************************
    /**
     * accessibilityAPI.
     * @param {(string|string[])} a_mode
     */
    set accessibilityAPI(a_mode) {
        const terms = ['AndroidAccessibility', 'ARIA', 'ATK', 'AT-SPI',
            'BlackberryAccessibility', 'iAccessible2', 'iOSAccessibility',
            'JavaAccessibility', 'MacOSXAccessibility', 'MSAA', 'UIAutomation'
        ];
        this._accessibilityAPI = this.__a11yterms('accessibilityAPI', terms, a_mode);
    }

    /**
     *
     * <code>required <sequence>DOMString accessibilityAPI;</code>
     *
     * @returns {string[]}
     */
    get accessibilityAPI() {
        return this._accessibilityAPI;
    }

    // ****************************
    /**
     * accessibilityFeature.
     * @param {(string|string[])} a_mode
     */
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

    /**
     *
     * <code>required <sequence>DOMString accessibilityFeature;</code>
     *
     * @returns {string[]}
     */
    get accessibilityFeature() {
        return this._accessibilityFeature;
    }

    // ****************************
    /**
     * accessibilityHazard.
     * @param {(string|string[])} a_mode
     */
    set accessibilityHazard(a_mode) {
        const terms = ['flashing', 'noFlashingHazard', 'motionSimulation',
            'noMotionSimulationHazard', 'sound', 'noSoundHazard',
            'unknown', 'none'
        ];
        this._accessibilityHazard = this.__a11yterms('accessibilityHazard', terms, a_mode);
    }

    /**
     *
     * <code>required <sequence>DOMString accessibilityHazard;</code>
     *
     * @returns {string[]}
     */
    get accessibilityHazard() {
        return this._accessibilityHazard;
    }

    // ****************************
    /**
     * accessibilitySummary.
     * @param {string} a_mode
     */
    set accessibilitySummary(a_mode) {
        this._accessibilitySummary = new LocalizableString(this.__logger, a_mode, this.__lang);
    }

    /**
     *
     * <code>required DOMString accessibilitySummary;</code>
     *
     * @returns {string}
     */
    get accessibilitySummary() {
        return this._accessibilitySummary;
    }

    // ****************************
    // --- required DOMString url;
    /**
     * Identifier.
     * @param {string} url_value
     */
    set id(url_value) {
        this._id = url.resolve(this.__base, url_value);
    }

    /**
     *
     * <code>DOMString id;</code>
     *
     * @returns {string}
     */
    get id() {
        return this._id;
    }

    // ****************************
    /**
     * artist.
     * @param {Person[]} value
     */
    set artist(value) {
        this._artist = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<Person> artist;</code>
     *
     * @returns {Person[]}
     */
    get artist() {
        return this._artist;
    }

    // ****************************
    /**
     * Author.
     * @param {(Person|Organization)[]} value
     */
    set author(value) {
        this._author = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> author;</code>
     *
     * @returns {(Person|Organization)[]}
     */
    get author() {
        return this._author;
    }

    // ****************************
    /**
     * Colorist.
     * @param {Person[]} value
     */
    set colorist(value) {
        this._colorist = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<Person> colorist;</code>
     *
     * @returns {Person[]}
     */
    get colorist() {
        return this._colorist;
    }

    // ****************************
    /**
     * Contributor.
     * @param {(Person|Organization)[]} value
     */
    set contributor(value) {
        this._contributor = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> contributor;</code>
     *
     * @returns {(Person|Organization)[]}
     */
    get contributor() {
        return this._contributor;
    }

    // ****************************
    /**
     * Creator.
     * @param {(Person|Organization)[]} value
     */
    set creator(value) {
        this._creator = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> creator;</code>
     *
     * @returns {(Person|Organization)[]}
     */
    get creator() {
        return this._creator;
    }

    // ****************************
    /**
     * Editor.
     * @param {Person[]} value
     */
    set editor(value) {
        this._editor = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<Person> editor;</code>
     *
     * @returns {Person[]}
     */
    get editor() {
        return this._editor;
    }

    // ****************************
    /**
     * Illustrator.
     * @param {Person[]} value
     */
    set illustrator(value) {
        this._illustrator = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<Person> illustrator;</code>
     *
     * @returns {Person[]}
     */
    get illustrator() {
        return this._illustrator;
    }

    // ****************************
    /**
     * Letterer.
     * @param {Person[]} value
     */
    set letterer(value) {
        this._letterer = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<Person> letterer;</code>
     *
     * @returns {Person[]}
     */
    get letterer() {
        return this._letterer;
    }

    // ****************************
    /**
     * Penciler.
     * @param {Person[]} value
     */
    set penciler(value) {
        this._penciler = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<Person> penciler;</code>
     *
     * @returns {Person[]}
     */
    get penciler() {
        return this._penciler;
    }

    // ****************************
    /**
     * Publisher.
     * @param {(Person|Organization)[]} value
     */
    set publisher(value) {
        this._publisher = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> publisher;</code>
     *
     * @returns {(Person|Organization)[]}
     */
    get publisher() {
        return this._publisher;
    }

    // ****************************
    /**
     * Readby.
     * @param {Person[]} value
     */
    set readby(value) {
        this._readby = Person.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<Person> readby;</code>
     *
     * @returns {Person[]}
     */
    get readby() {
        return this._readby;
    }

    // ****************************
    /**
     * Translator.
     * @param {(Person|Organization)[]} value
     */
    set translator(value) {
        this._translator = Contributor.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> translator;</code>
     *
     * @returns {(Person|Organization)[]}
     */
    get translator() {
        return this._translator;
    }

    // ****************************
    /**
     * Base language of the publication.
     * @param {string} value
     */
    set inLanguage(value) {
        if (value === undefined) return;
        if (this.__logger.assert(bcppattern.test(value), `"${value}" is not a valid language tag`, LogLevel.warning)) {
            this._inLanguage = value;
        }
    }

    /**
     *
     * <code>DOMString inLanguage;</code>
     *
     * @returns {string}
     */
    get inLanguage() {
        return this._inLanguage;
    }

    // ****************************
    /**
     * Base direction of the publication.
     * @param {string} value
     */
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
                this.__logger.assert(false, `"${value}" is not a valid text direction tag`, LogLevel.warning);
        }
    }

    /**
     *
     * <code>TextDirection inDirection;</code>
     *
     * @returns {TextDirection}
     */
    get inDirection() {
        return this._inDirection;
    }

    // ****************************
    // --- DOMString dateModifed;
    /**
     * Modification date of the publication.
     * @param {string} date
     */
    set dateModifed(date) {
        if (this.__logger.assert(moment(date).isValid(), `"${date}" is an invalid Date or DateTime string.`, LogLevel.warning)) {
            this._dateModifed = date;
        }
    }

    /**
     *
     * <code>DOMString dateModifed;</code>
     *
     * @returns {string}
     */
    get dateModifed() {
        return this._dateModifed;
    }

    // ****************************
    /**
     * Publication date of the publication.
     * @param {string} date
     */
    set datePublished(date) {
        if (this.__logger.assert(moment(date).isValid(), `"${date}" is an invalid Date or DateTime string.`, LogLevel.warning)) {
            this._datePublished = date;
        }
    }

    /**
     *
     * <code>DOMString datePublished;</code>
     *
     * @returns {string}
     */
    get datePublished() {
        return this._datePublished;
    }

    // ****************************
    /**
     * Progression direction of the publication.
     * @param {string} value
     */
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

    /**
     *
     * <code>required ProgressionDirection readingProgression;</code>
     *
     * @returns {ProgressionDirection}
     */
    get readingProgression() {
        return this._readingProgression;
    }

    // ****************************
    /**
     * Reading order of the publication.
     * @param {(string|PublicationLink)[]} value
     */
    set readingOrder(value) {
        this._readingOrder = PublicationLink.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<PublicationLink> readingOrder;</code>
     *
     * @returns {PublicationLink[]}
     */
    get readingOrder() {
        return this._readingOrder;
    }

    // ****************************
    /**
     * Resources of the publication.
     * @param {(string|PublicationLink)[]} value
     */
    set resources(value) {
        this._resources = PublicationLink.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<PublicationLink> resources;</code>
     *
     * @returns {PublicationLink[]}
     */
    get resources() {
        return this._resources;
    }

    // ****************************
    /**
     * (External) links of the publication.
     * @param {(string|PublicationLink)[]} value
     */
    set links(value) {
        this._links = PublicationLink.initArray(this.__logger, value, this.__base, this.__lang);
    }

    /**
     *
     * <code>sequence<PublicationLink> links;</code>
     *
     * @returns {PublicationLink[]}
     */
    get links() {
        return this._links;
    }

    // ****************************
    /**
     * name of the publication.
     * @param {(string|Object)[]} names
     */
    set name(names) {
        this._name = LocalizableString.initArray(this.__logger, names, this.__lang);
    }

    /**
     *
     * <code>sequence<LocalizableString> name;</code>
     *
     * @returns {LocalizableString[]}
     */
    get name() {
        return this._name;
    }

    // ****************************
    /**
     *
     * <code>PublicationLink  accessibilityReport;</code>
     *
     * @returns {PublicationLink}
     */
    get accessibilityReport() {
        const find_link = (where) => WebPublicationManifest.__find_link(where, 'https://www.w3.org/ns/wp#accessibility-report');

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
    /**
     *
     * <code>PublicationLink  privacyPolicy;</code>
     *
     * @returns {PublicationLink}
     */
    get privacyPolicy() {
        const find_link = (where) => WebPublicationManifest.__find_link(where, 'privacy-policy');

        if (this.__privacyPolicy_searched) {
            return this.__privacyPolicy;
        }
        this.__privacyPolicy_searched = true;
        this.__privacyPolicy = find_link(this._readingOrder) || find_link(this._resources) || find_link(this._links);
        return this.__privacyPolicy;
    }

    // ****************************
    // --- PublicationLink cover;
    /**
     *
     * <code><sequence>PublicationLink  cover;</code>
     *
     * @returns {PublicationLink[]}
     */
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

    // ****************************
    /**
     *
     * This is a bit convoluted: the manifest processing part retrieves the possible toc link, and sets the final toc value
     * separately.
     *
     * The reason this is not done "inside" the class instance, just like it is the case for other similar functions (e.g., links) is
     * that finding the toc element involves async methods. This would mean that getting the toc HTML Element would become an
     * async function, which means that the final consumer of the WebPublicationManifest would have to take care of being noted
     * as async (and use, eg, 'await' for getting the value), which may be a drag. So the actual search of the TOC element is
     * done outside of the object, namely in the manifest processing method (which is async anyway).
     *
     * @returns {HTMLElement}
     */
    get _toc_reference() {
        const find_link = (where) => WebPublicationManifest.__find_link(where, 'contents');
        if (this.__toc_link_searched) {
            return this.___toc_link;
        }
        this.__toc_searched = true;
        this.__toc_link = find_link(this._readingOrder) || find_link(this._resources) || find_link(this._links);
        return this.__toc_link;
    }

    /**
     *
     * @param {HTMLElement}
     */
    set toc(value) {
        this._toc = value;
    }

    /**
     *
     * <code>HTMLElement toc;</code>
     *
     * @returns {HTMLElement}
     */
    get toc() {
        return this._toc;
    }
}


/* =================================================================================== */

module.exports = { WebPublicationManifest };
