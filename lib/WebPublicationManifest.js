/**
 * This is the representation of the Web Publication Manifest IDL interfaces in Javascript classes.
 *
 * The reason why classes are used, as opposed to objects, it that checking the attributes in the setter
 * method looked like a cleaner code than putting all the checks in the process that make the manifest mapping.
 */

'use strict';

const url           = require('url');
const { condClone } = require('./utils');


/* -------------------------------------- */
/**
 * dictionary LocalizableString {
 *   required DOMString       value;
 *            DOMString       lang;
 * };
 */
class LocalizableString {
    constructor(obj, lang = '') {
        this._value = undefined;
        this._lang = '';
        if (obj instanceof Object) {
            this._value = obj['@value'];
            this._lang = obj['@language'];
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

    static initArray(values, lang) {
        const nameArray = Array.isArray(values) ? values : [values];
        return nameArray.map((name) => new LocalizableString(name, lang));
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
    constructor(obj, base, lang) {
        if (obj instanceof Object) {
            this._name = LocalizableString.initArray(obj.name, lang);
            this._id = obj['@id'] || undefined;
            this._url = obj.url ? url.resolve(base, obj.url) : undefined;

            // Copy the rest of the information into "this"; these properties
            // are not defined by the WebIDL, though, but one would think
            // they should not be lost...
            // The strange idiom to deep clone an object...
            condClone(['name', '@id', 'url', '@type'], obj, this);
        } else {
            this._name = new LocalizableString(obj, lang);
            this._id = undefined;
            this._url = undefined;
        }
    }

    get name() { return this._name; }

    get id() { return this._id; }

    get url() { return this._url; }

    static initArray(objs, base, lang) {
        const objArray = Array.isArray(objs) ? objs : [objs];
        return objArray.map((obj) => {
            if (obj instanceof Object) {
                const type = obj['@type'] || 'undefined';
                if (type === 'Organization') {
                    return new Organization(obj, base, lang);
                }
                return new Person(obj, base, lang);
            }
            return new Person(obj, base, lang);
        });
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
    static initArray(values, base, lang) {
        const personArray = Array.isArray(values) ? values : [values];
        return personArray.map((name) => new Person(name, base, lang));
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
    static initArray(values, base, lang) {
        const orgArray = Array.isArray(values) ? values : [values];
        return orgArray.map((name) => new Organization(name, base, lang));
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
    constructor(obj, base, lang) {
        if (obj instanceof Object) {
            this._url = url.resolve(base, obj.url);
            this._encodingFormat = obj.encodingFormat || undefined;
            this._name = (obj.name) ? new LocalizableString(obj.name, lang) : undefined;
            this._description = (obj.description) ? new LocalizableString(obj.description, lang) : undefined;
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

    static initArray(values, base, lang) {
        const nameArray = Array.isArray(values) ? values : [values];
        return nameArray.map((name) => new PublicationLink(name, base, lang));
    }
}

/* -------------------------------------- */
class WebPublicationManifest {
    constructor(base, lang) {
        this._base = base;
        this._lang = lang;
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

    // ****************************
    // --- required DOMString url;
    set url(url_value) {
        this._url = url.resolve(this._base, url_value);
    }

    get url() { return this._url; }

    // ****************************
    // --- required DOMString type;
    set type(type) { this._type = type; }

    get type() { return this._type; }


    // ****************************
    // --- sequence<DOMString> accessMode
    set accessMode(a_mode) {
        this._accessMode = Array.isArray(a_mode) ? a_mode : [a_mode];
    }

    get accessMode() {
        return this._accessMode;
    }

    // ****************************
    // --- sequence<DOMString> accessMode
    set accessModeSufficient(a_mode) {
        this._accessModeSufficient = Array.isArray(a_mode) ? a_mode : [a_mode];
    }

    get accessModeSufficient() {
        return this._accessModeSufficient;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityControl
    set accessibilityControl(a_mode) {
        this._accessibilityControl = Array.isArray(a_mode) ? a_mode : [a_mode];
    }

    get accessibilityControl() {
        return this._accessibilityControl;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityAPI
    set accessibilityAPI(a_mode) {
        this._accessibilityAPI = a_mode;
    }

    get accessibilityAPI() {
        return this._accessibilityAPI;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityFeature
    set accessibilityFeature(a_mode) {
        this._accessibilityFeature = Array.isArray(a_mode) ? a_mode : [a_mode];
    }

    get accessibilityFeature() {
        return this._accessibilityFeature;
    }

    // ****************************
    // --- sequence<DOMString> accessibilityHazard
    set accessibilityHazard(a_mode) {
        this._accessibilityHazard = Array.isArray(a_mode) ? a_mode : [a_mode];
    }

    get accessibilityHazard() {
        return this._accessibilityHazard;
    }

    // ****************************
    // --- sequence<DOMString> accessibilitySummary
    set accessibilitySummary(a_mode) {
        this._accessibilitySummary = new LocalizableString(a_mode, this._lang);
    }

    get accessibilitySummary() {
        return this._accessibilitySummary;
    }

    // ****************************
    // --- required DOMString url;
    set id(url_value) {
        this._id = url.resolve(this._base, url_value);
    }

    get id() {
        return this._url;
    }

    // ****************************
    // --- sequence<Person> artist;
    set artist(value) {
        this._artist = Person.initArray(value, this._base, this._lang);
    }

    get artist() {
        return this._artist;
    }

    // ****************************
    // --- sequence<(Person or Organization)> author;
    set author(value) {
        this._author = Contributor.initArray(value, this._base, this._lang);
    }

    get author() {
        return this._author;
    }

    // ****************************
    // --- sequence<Person> colorist;
    set colorist(value) {
        this._colorist = Person.initArray(value, this._base, this._lang);
    }

    get colorist() {
        return this._colorist;
    }

    // ****************************
    // --- sequence<(Person or Organization)> contributor;
    set contributor(value) {
        this._contributor = Contributor.initArray(value, this._base, this._lang);
    }

    get contributor() {
        return this._contributor;
    }

    // ****************************
    // --- sequence<(Person or Organization)> creator;
    set creator(value) {
        this._creator = Contributor.initArray(value, this._base, this._lang);
    }

    get creator() {
        return this._creator;
    }

    // ****************************
    // --- sequence<Person> editor;
    set editor(value) {
        this._editor = Person.initArray(value, this._base, this._lang);
    }

    get editor() {
        return this._editor;
    }

    // ****************************
    // --- sequence<Person> illustrator;
    set illustrator(value) {
        this._illustrator = Person.initArray(value, this._base, this._lang);
    }

    get illustrator() {
        return this._illustrator;
    }

    // ****************************
    // --- sequence<Person> letterer;
    set letterer(value) {
        this._letterer = Person.initArray(value, this._base, this._lang);
    }

    get letterer() {
        return this._letterer;
    }

    // ****************************
    // --- sequence<Person> penciler;
    set penciler(value) {
        this._penciler = Person.initArray(value, this._base, this._lang);
    }

    get penciler() {
        return this._penciler;
    }

    // ****************************
    // --- sequence<(Person or Organization)> publisher;
    set publisher(value) {
        this._publisher = Contributor.initArray(value, this._base, this._lang);
    }

    get publisher() {
        return this._publisher;
    }

    // ****************************
    // --- sequence<Person> readby;
    set readby(value) {
        this._readby = Person.initArray(value, this._base, this._lang);
    }

    get readby() {
        return this._readby;
    }

    // ****************************
    // --- sequence<(Person or Organization)> translator;
    set translator(value) {
        this._translator = Contributor.initArray(value, this._base, this._lang);
    }

    get translator() {
        return this._translator;
    }

    // ****************************
    // --- DOMString inLanguage;
    set inLanguage(value) {
        this._inLanguage = value;
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
            default:
                this._inDirection = TextDirection.auto;
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
            default:
            case 'ltr':
                this._readingProgression = ProgressionDirection.ltr;
                break;
        }
    }

    get readingProgression() {
        return this._readingProgression;
    }

    // ****************************
    // --- sequence<PublicationLink> readingOrder;
    set readingOrder(value) {
        this._readingOrder = PublicationLink.initArray(value, this._base, this._lang);
    }

    get readingOrder() {
        return this._readingOrder;
    }

    // ****************************
    // --- sequence<PublicationLink> resources;
    set resources(value) {
        this._resources = PublicationLink.initArray(value, this._base, this._lang);
    }

    get resources() {
        return this._resources;
    }

    // ****************************
    // --- sequence<PublicationLink> links;
    set links(value) {
        this._links = PublicationLink.initArray(value, this._base, this._lang);
    }

    get links() {
        return this._links;
    }

    // ****************************
    // --- sequence<LocalizableString> name
    set name(names) {
        this._name = LocalizableString.initArray(names, this._lang);
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
