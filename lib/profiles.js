'use strict';

const misc_arrays_properties = [
    'type',
    'name',
    'rel'
];

const a11y_properties = [
    'accessMode',
    'accessModeSufficient',
    'accessibilityAPI',
    'accessibilityControl',
    'accessibilityFeature',
    'accessibilityHazard'
];

const creator_properties = [
    'artist',
    'author',
    'contributor',
    'creator',
    'editor',
    'illustrator',
    'inker',
    'letterer',
    'penciler',
    'publisher',
    'readBy',
    'translator'
];

const resource_categorization_properties = [
    'readingOrder',
    'resources',
    'links'
];

const core_profile = {
    array_values        : [...misc_arrays_properties, ...a11y_properties, ...creator_properties, ...resource_categorization_properties],
    entity_values       : [...creator_properties],
    link_values         : [...resource_categorization_properties],
    local_string_values : ['description', 'name', 'accessibilitySummary'],
    url_values          : ['url', 'id'],
    profile_c14n        : null
};

const test_profile = {
    array_values        : core_profile.array_values,
    entity_values       : ['painter', ...core_profile.array_values],
    link_values         : core_profile.link_values,
    local_string_values : core_profile.local_string_values,
    url_values          : core_profile.url_values,
    profile_c14n        : (manifest, base, document, lang, dir) => manifest
};

/* =================================================================================== */
module.exports = { core_profile, test_profile };
