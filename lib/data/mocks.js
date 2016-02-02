/**
 * @file Generator functions for creating model instances populated with random data.
 *
 * As many of the fields as possible are generated randomly but in some cases, mostly
 * relations, existing instances must be provided. The only type that does not have a
 * generator is `Site`. This is an intentional choice since the number and location of
 * sites is mostly known and it will provide a better testing experience if the mock
 * data is closer to reality in this one case.
 */
'use strict';

var chance = require('chance').Chance();
var request = require('request-promise');

var Activity = require('../models/activity').Model;
var Idea = require('../models/idea').Model;
var Observation = require('../models/observation').Model;
var Site = require('../models/site').Model;
var User = require('../models/user').Model;

/**
 * Approximation of km -> degrees of latitude conversion.
 */
function km_to_latitude (kms) {
    return kms / 110.57;
}

/**
 * Approximation of km -> degrees of longitude conversion.
 */
function km_to_longitude (kms) {
    return kms / 111.32;
}

/**
 * Provides a random `[longitude, latitude]` pair near another location.
 * defaults to a range of +/- 50km unless explicity passed.
 *
 * @param {array} location - the location to generate a point near, must be an array
 *                           of the form [longitude, latitude].
 * @param {number} range   - the maximum radius in km from the location to generate values in.
 *                           uniformly applied for both longitude and latitude.
 */
function location_near (location, range) {
    if (!range) range = 50;
    return [
        chance.longitude({
            min: location[0] - km_to_longitude(range),
            max: location[0] + km_to_longitude(range)}),
        chance.latitude({
            min: location[1] - km_to_latitude(range),
            max: location[1] + km_to_latitude(range)}),
    ];
}

/**
 * Requests a random user avatar from http://uifaces.com and returns its url.
 *
 * @returns {Promise} - the url of the avatar.
 * @see {@link http://uifaces.com/api|UIFaces}.
 */
function random_avatar () {
    return request({ uri: 'http://uifaces.com/api/v1/random', json: true })
        .then(body => { return body.image_urls.normal; });
}

// all the icons we currently have for ACES.
var activity_icons = [
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461260/3_Tracks_k6imha.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461260/3_Native_ebbttv.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1427400563/2_FreeObservations_mjzgnh.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461260/3_RedMountain_vwcwpi.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1427400563/2_Snow_rutfs8.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461261/3_Ask_kco6wn.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461261/3_Backyard_nxipz5.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461260/3_Mallard_hmdkqj.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431640537/3_Heron2_j0j3qx.png",
    "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461260/3_Who_ncnsij.png"
];

// copied from the responses provided by the existing server
var consent_text =
`(Required) I agree that any nature photos I take using the NatureNet application
may be uploaded to the tabletop at ACES and/or a website now under development.
(Required) I agree to allow any comments, observations, and profile information
that I choose to share with others via the online application to be visible to
others who use the application at the same time or after me.`;

// all the different idea groups currently present
var idea_groups = [
    "Wouldn't it be cool if...",
    "It would be better if...",
    "Open Suggestion"
];

module.exports = {

    // mostly exported for testing, might be useful for some manual seeding.
    avatar: random_avatar,

    /**
     * Creates a random activity at a site positioned somewhere within a 10km radius.
     * The created activity will reference only the passed in site. To create an activity
     * present at more then one site modify the created instance and save again.
     *
     * @param {Site} site - the site to create the activity in.
     * @returns {Promise} - the create operation.
     */
    activity: function (site) {
        return Activity.create({
            name: `activity-${chance.word()}`,
            sites: [{ site_id: site, location: location_near(site.location, 10)}],
            description: chance.paragraph(),
            icon_url: chance.pick(activity_icons),
            markup: `<h1>${chance.sentence()}</h1><p>${chance.paragraph()}</p>`
        });
    },

    /**
     * Creates a random user.
     *
     * @returns {Promise} - the create operation.
     */
    user: function () {
        return random_avatar()
            .then(url => {
                return User.signup({
                    email: `testuser-${chance.word()}@nature-net.org`,
                    password: chance.word({length: 10}),
                    avatar_url: url,
                    consent_text: consent_text
                });
            });
    },

    /**
     * Creates a random design idea submitted by the passed in user.
     *
     * @param {User} user - the user who should be used as the submitter.
     * @returns {Promise} - the create operation.
     */
    idea: function (user) {
        return Idea.create({
            submitter: user,
            group: chance.pick(idea_groups),
            content: chance.sentence()
        });
    },

    /**
     * Creates a random observation submitted by the passed in user and
     * within 1km of the location of the activity. Only the first site
     * the activity is linked with will be used.
     *
     * @param {Activity} activity - the activity to create the observation for.
     * @param {User} user - the user who should be used as the submitter.
     * @returns {Promise} - the create operation.
     */
    observation: function (activity, user) {
        return Observation.create({
            activity: {
                activity_id: activity,
                site_id: activity.sites[0].site_id},
            observer: user,
            location: location_near(activity.sites[0].location, 1),
            data: {
                a: chance.word(),
                b: chance.integer(),
                c: chance.bool()
            }
        });
    },

    /**
     * Adds a random comment to any of the commentable models.
     *
     * @param {object} commentable - an instance of any model that has comments enabled.
     * @param {User} user - the user who should be used as the commenter.
     * @returns {Promise} - the update operation.
     */
    comment: function (commentable, user) {
        commentable.add_comment(user, chance.sentence());
        return commentable.save();
    }
};

