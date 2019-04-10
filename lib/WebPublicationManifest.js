/**
 * This is the representation of the Web Publication Manifest WebIDL interfaces in Javascript classes.
 *
 * The reason why classes are used, as opposed to objects, it that checking the attributes in the setter
 * method looked like a cleaner code than putting all the checks in the process that make the manifest mapping.
 */

'use strict';

const npt = require('normalplaytime');
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
     * @param {Object} obj - an object with '@value' and '@language'. Corresponds to the JSON-LD.
     */
    constructor(logger, obj) {
        if (logger.assert(obj.value !== undefined, 'String without value', LogLevel.error)) {
            this._value = obj.value;
        } else {
            this._value = undefined;
            this.__invalid = true;
        }
        this._language = obj.language;
        if (this._language) {
            if (!logger.assert(bcppattern.test(this._language), `"${this._language}" is not a valid language tag`, LogLevel.warning)) {
                this._language = undefined;
            }
        }
    }

    get value() {
        return this._value;
    }

    get language() {
        return this._language;
    }

    /**
     * Generate an array of LocalizableString objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or literal objects.
     * @returns {LocalizableString[]} value may be [] if no value is legitimate (ie, "value" is missing.
     */
    static initArray(logger, values) {
        return values.map((name) => new LocalizableString(logger, name)).filter((name) => name.__invalid !== true);
    }
}


/* -------------------------------------- */
/**
 * Contributor. The interface is based on the following WebIDL:
 *
 * <pre><code>
 * dictionary Contributor {
 *              sequence<DOMString>         type;
 *     required sequence<LocalizableString> name;
 *              DOMString                   id;
 *              DOMString                   url;
 * };
 * </code></pre>
 */
class Contributor {
    /**
     * Create a new Contributor. The class is set to be "invalid" (by setting this.__invalid = true) if no name is provided; such
     * classes are removed from the final reposonses.
     *
     * @param {Object} logger - logger for errors and warnings.
     * @param {Object|string} obj - name of the contributor, or an object with at least a "name" property, possibly "url" and "id".
     * @param {boolean} person_only - whether only a Person should be accepted in this position
     */
    constructor(logger, obj, person_only = false) {
        if (logger.assert(obj.name !== undefined, 'Invalid contributor: no name provided.', LogLevel.error)) {
            this._name = LocalizableString.initArray(logger, obj.name);
        } else {
            this._name = undefined;
            this.__invalid = true;
        }

        if (this.__invalid !== true) {
            if (obj.type) {
                this._type = obj.type;
                // is it a person or an organization?
                const is_person = this._type.includes('Person');
                const is_organization = this._type.includes('Organization');
                if (!is_organization && !is_person) {
                    logger.assert(false, `Contributor must be an "Organization" or a "Person" (${this._name[0].value})`, LogLevel.error);
                    this.__invalid = true;
                } else if (person_only && !is_person) {
                    logger.assert(false, `Only a "Person" is acceptable in this position (${this._name[0].value})`, LogLevel.error);
                    this.__invalid = true;
                }
            } else {
                this._type = ['Person'];
            }
        }
        this._id = obj.id || undefined;
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
        condClone(['name', 'id', 'url', 'type'], obj, this);
    }

    get name() { return this._name; }

    get id() { return this._id; }

    get url() { return this._url; }

    get type() { return this._type; }

    /**
     * Generate an array of Contributor objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or Contributor objects.
     * @param {boolean} person_only - whether only a Person should be accepted in this position
     * @returns {Contributor[]}  value is an empty array if none of the values are legitimate.
     */
    static initArray(logger, objs, person_only = false) {
        return objs.map((obj) => new Contributor(logger, obj, person_only)).filter((contributor) => contributor.__invalid !== true);
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
 * dictionary LinkedResource {
 *     required DOMString           url;
 *              DOMString           encodingFormat;
 *              LocalizableString   name;
 *              LocalizableString   description;
 *              sequence<DOMString> rel;
 *              DOMString           duration;
 * };
 * </code></pre>
 */
class LinkedResource {
    /**
     * Create a new LinkedResource. The class is set to be "invalid" (by setting this.__invalid = true) if no url is provided; such
     * classes are removed from the final responses.
     *
     * @param {Object} logger - logger for errors and warnings.
     * @param {Object|string} obj - URL as a string, or an object with at least a "url" property, possibly
     * "encodingFormat", "name", "description", "rel", and "duration".
     * @param {string} base - base URL to be used for relative URL-s.
     * @param {boolean} m_separate - whether the manifest is a separate file or is embedded.
     */
    constructor(logger, obj, base, m_separate) {
        if (logger.assert(obj.url !== undefined, 'Invalid publication link: no URL provided.', LogLevel.error)) {
            this._url = obj.url;
            check_url(this._url, logger);
        } else {
            this._url = undefined;
            this.__invalid = true;
        }

        this._encodingFormat = obj.encodingFormat || undefined;
        this._name = (obj.name) ? LocalizableString.initArray(logger, obj.name) : undefined;
        this._description = (obj.description) ? new LocalizableString(logger, obj.description) : undefined;
        this._rel = obj.rel || undefined;
        this._duration = obj.duration || undefined;

        // Check the validity of the duration value; a warning should be issued if it isn't correct
        if (this._duration) {
            logger.assert(npt.parse(this._duration) !== null, `${this._duration} is an invalid NPT value.`, LogLevel.warning);
        }

        // Copy the rest of the information into "this"; these properties
        // are not defined by the WebIDL, though, but one would think
        // they should not be lost...
        // The strange idiom to deep clone an object...
        condClone(['type', 'url', 'encodingFormat', 'name', 'description', 'rel', 'duration'], obj, this);

        // The draft says that the Manifest URL must not appear as such link. This should be checked
        // when the manifest is a separate file...
        if (m_separate) {
            if (!logger.assert(this._url !== base, 'Manifest URL must not be part of a link', LogLevel.error)) {
                this.__invalid = true;
            }
        }
    }

    get url() { return this._url; }

    get encodingFormat() { return this._encodingFormat; }

    get name() { return this._name; }

    get description() { return this._description; }

    get rel() { return this._rel; }

    get duration() { return this._duration; }

    /**
     * Generate an array of Contributor objects.
     * @static
     * @param {Object} logger - logger for errors and warnings.
     * @param {(Object|string)[]} values - string or LinkedResource objects.
     * @param {boolean} m_separate - whether the manifest is a separate file or is embedded.
     * @returns {LinkedResource[]}  value is "undefined" if none of the values are legitimate.
     */
    static initArray(logger, values, base, m_separate) {
        return values.map((name) => new LinkedResource(logger, name, base, m_separate)).filter((link) => link.__invalid !== true);
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
     * @param {boolean} m_separate - whether the manifest originates from a separate file or is embedded.
     */
    constructor(logger, base, m_separate) {
        this.__logger = logger;
        this.__base = base;
        this.__m_separate = m_separate;
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
        this._inker = undefined;
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
        this._readingOrder = undefined;
        this._resources = [];
        this._links = [];
        this._toc = undefined;

        this.__accessibilityReport_searched = false;
        this.__privacyPolicy_searched = false;
        this.__cover_searched = false;
        this.__toc_searched = false;
    }

    // -------------------------------------------------------------------------
    /**
     * Helper function: check whether an accessibility term is valid or not, and produces
     * an array of valid items (or undefined if no valid items are found)
     * @param {string} term: the term for which this check is done (used in the warning message)
     * @param {Array} allowed_terms: list of string terms that are allowed to be used
     * @param {string[]} a_mode: a11y modes to be checked
     * @returns {Array}: array of strings or undefined
     */
    __a11yterms(term, allowed_terms, a_mode) {
        const check = (item) => this.__logger.assert(allowed_terms.includes(item), `"${item}" may not be a valid term for ${term}`, LogLevel.warning);
        return a_mode.map((item) => (check(item) ? item : null)).filter((item) => item !== null);
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
        this._url = url_value;
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
    set type(type) { this._type = type; }

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
     * @param {string[]} a_mode
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
     * @param {string[]} a_mode
     */
    set accessModeSufficient(a_mode) {
        const terms = ['auditory', 'tactile', 'textual', 'visual'];
        this._accessModeSufficient = a_mode.map((str) => {
            const inner_array = str.split(',').map((val) => val.trim());
            const checked = this.__a11yterms('accessModeSufficient', terms, inner_array);
            return (checked.length === 0) ? undefined : checked.join(',');
        }).filter((item) => item !== undefined);
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
     * @param {string[]} a_mode
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
     * @param {string[]} a_mode
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
     * @param {string[]} a_mode
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
     * @param {string[]} a_mode
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
        this._accessibilitySummary = new LocalizableString(this.__logger, a_mode);
    }

    /**
     *
     * <code>required DOMString accessibilitySummary;</code>
     *
     * @returns {LocalizableString}
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
        this._id = url_value;
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
     * @param {Contributor[]} value
     */
    set artist(value) {
        this._artist = Contributor.initArray(this.__logger, value, true);
    }

    /**
     *
     * <code>sequence<Person> artist;</code>
     *
     * @returns {Contributor[]}
     */
    get artist() {
        return this._artist;
    }

    // ****************************
    /**
     * Author.
     * @param {Contributor[]} value
     */
    set author(value) {
        this._author = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> author;</code>
     *
     * @returns {Contributor[]}
     */
    get author() {
        return this._author;
    }

    // ****************************
    /**
     * Colorist.
     * @param {Contributor[]} value
     */
    set colorist(value) {
        this._colorist = Contributor.initArray(this.__logger, value, true);
    }

    /**
     *
     * <code>sequence<Person> colorist;</code>
     *
     * @returns {Contributor[]}
     */
    get colorist() {
        return this._colorist;
    }

    // ****************************
    /**
     * Contributor.
     * @param {Contributor[]} value
     */
    set contributor(value) {
        this._contributor = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> contributor;</code>
     *
     * @returns {Contributor[]}
     */
    get contributor() {
        return this._contributor;
    }

    // ****************************
    /**
     * Creator.
     * @param {Contributor[]} value
     */
    set creator(value) {
        this._creator = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> creator;</code>
     *
     * @returns {Contributor[]}
     */
    get creator() {
        return this._creator;
    }

    // ****************************
    /**
     * Editor.
     * @param {Contributor[]} value
     */
    set editor(value) {
        this._editor = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<Person> editor;</code>
     *
     * @returns {Contributor[]}
     */
    get editor() {
        return this._editor;
    }

    // ****************************
    /**
     * Illustrator.
     * @param {Contributor[]} value
     */
    set illustrator(value) {
        this._illustrator = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<Person> illustrator;</code>
     *
     * @returns {Contributor[]}
     */
    get illustrator() {
        return this._illustrator;
    }

    // ****************************
    /**
     * Inker.
     * @param {Contributor[]} value
     */
    set inker(value) {
        this._inker = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<Person> illustrator;</code>
     *
     * @returns {Contributor[]}
     */
    get inker() {
        return this._inker;
    }

    // ****************************
    /**
     * Letterer.
     * @param {Contributor[]} value
     */
    set letterer(value) {
        this._letterer = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<Person> letterer;</code>
     *
     * @returns {Contributor[]}
     */
    get letterer() {
        return this._letterer;
    }

    // ****************************
    /**
     * Penciler.
     * @param {Contributor[]} value
     */
    set penciler(value) {
        this._penciler = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<Person> penciler;</code>
     *
     * @returns {Contributor[]}
     */
    get penciler() {
        return this._penciler;
    }

    // ****************************
    /**
     * Publisher.
     * @param {Contributor[]} value
     */
    set publisher(value) {
        this._publisher = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> publisher;</code>
     *
     * @returns {Contributor[]}
     */
    get publisher() {
        return this._publisher;
    }

    // ****************************
    /**
     * Readby.
     * @param {Contributor[]} value
     */
    set readby(value) {
        this._readby = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<Person> readby;</code>
     *
     * @returns {Contributor[]}
     */
    get readby() {
        return this._readby;
    }

    // ****************************
    /**
     * Translator.
     * @param {Contributor[]} value
     */
    set translator(value) {
        this._translator = Contributor.initArray(this.__logger, value);
    }

    /**
     *
     * <code>sequence<(Person or Organization)> translator;</code>
     *
     * @returns {Contributor[]}
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
    set dateModified(date) {
        if (this.__logger.assert(!isNaN(Date.parse(date)), `"${date}" is an invalid Date or DateTime string for the modification date.`, LogLevel.warning)) {
            this._dateModified = date;
        }
    }

    /**
     *
     * <code>DOMString dateModified;</code>
     *
     * @returns {string}
     */
    get dateModified() {
        return this._dateModified;
    }

    // ****************************
    /**
     * Publication date of the publication.
     * @param {string} date
     */
    set datePublished(date) {
        if (this.__logger.assert(!isNaN(Date.parse(date)), `"${date}" is an invalid Date or DateTime string for the publication date.`, LogLevel.warning)) {
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
     * @param {(string|LinkedResource)[]} value
     */
    set readingOrder(value) {
        this._readingOrder = LinkedResource.initArray(this.__logger, value, this.__base, this.__m_separate);
    }

    /**
     *
     * <code>sequence<LinkedResource> readingOrder;</code>
     *
     * @returns {LinkedResource[]}
     */
    get readingOrder() {
        return this._readingOrder;
    }

    // ****************************
    /**
     * Resources of the publication.
     * @param {(string|LinkedResource)[]} value
     */
    set resources(value) {
        this._resources = LinkedResource.initArray(this.__logger, value, this.__base, this.__m_separate);
    }

    /**
     *
     * <code>sequence<LinkedResource> resources;</code>
     *
     * @returns {LinkedResource[]}
     */
    get resources() {
        return this._resources;
    }

    // ****************************
    /**
     * (External) links of the publication.
     * @param {(string|LinkedResource)[]} value
     */
    set links(value) {
        this._links = LinkedResource.initArray(this.__logger, value, this.__base, this.__m_separate);
    }

    /**
     *
     * <code>sequence<LinkedResource> links;</code>
     *
     * @returns {LinkedResource[]}
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
        this._name = LocalizableString.initArray(this.__logger, names);
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
}

/* =================================================================================== */

module.exports = { WebPublicationManifest };
