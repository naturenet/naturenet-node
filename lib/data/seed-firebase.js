'use strict';
const chance = require('chance').Chance();
const request = require('request-promise');

const Sites = require('../models/site');
const Activities = require('../models/activity');
const Users = require('../models/user');
const Observations = require('../models/observation');
const Ideas = require('../models/idea');

/**
 * Approximation of km -> degrees of latitude conversion.
 */
function kmToLatitude (kms) {
    return kms / 110.57;
}

/**
 * Approximation of km -> degrees of longitude conversion.
 */
function kmToLongitude (kms) {
    return kms / 111.32;
}

/**
 * Provides a random `[longitude, latitude]` pair near another location.
 *
 * @param {array} location - the location to generate a point near, must be an array
 *                           of the form [longitude, latitude].
 * @param {number} range   - the maximum radius in km from the location to generate values in.
 *                           uniformly applied for both longitude and latitude.
 */
function locationNear (location, range) {
    return [
        chance.longitude({
            min: location[0] - kmToLongitude(range),
            max: location[0] + kmToLongitude(range)}),
        chance.latitude({
            min: location[1] - kmToLatitude(range),
            max: location[1] + kmToLatitude(range)}),
    ];
}

/**
 * Repeats a promise-returning operation a set number of times. Firebase will put a temporary
 * block on a client that makes too many requests in a short time period. This function essentially
 * serializes each write we make as part of the seeding.
 */
function repeat(times, operation) {
    return operation()
        .then(ok => {
            if ((times - 1) > 0) {
                return repeat(times - 1, operation);
            }
            return ok;
        });
}

/**
 * Deletes all users in the application that are marked `testuser: true`.
 */
function dropTestUsers() {
    return new Promise((resolve, reject) => {
        Users.root.orderByChild('public/testuser').equalTo(true).once("value", snapshot => {
            let list = snapshot.val();
            if (!list) {
                resolve();
            } else {
                let ids = Object.keys(list);
                let deleteUser = function() {
                    let id = ids.shift();
                    return Users.root.removeUser({email: list[id].private.email, password: 'testuser'})
                        .then(ok => {
                            return Users.root.child(id).remove();
                        });
                };
                resolve(repeat(ids.length, deleteUser));
            }
        }, error => {
            reject(err);
        });
    });
}

/**
 * Deletes all records and test users.
 */
function cleanDb() {
    return Sites.drop()
    .then(ok => { return Activities.drop() })
    .then(ok => { return dropTestUsers() })
    .then(ok => { return Observations.drop() })
    .then(ok => { return Ideas.drop() });
}

var mockSites = [];

/**
 * Generates a preset pair of sites to use for testing.
 */
function seedSites() {
    let aces = Sites.newRecord("aces", {
        name: 'ACES',
        description: "Aspen Center for Environmental Studies",
        location: [39.1965355,-106.8242489]
    });
    let shirakami = Sites.newRecord("shirakami", {
        name: '白神山地',
        description: "Shirakami Mountain National Park",
        location: [41.4163605, 140.2056501]
    });
    return Promise.all([
        aces.write().then(site => mockSites.push(site)),
        shirakami.write().then(site => mockSites.push(site))
    ]);
}

var activityIcons = [
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

var mockActivities = [];

/**
 * Creates a single activity with randomized data.
 */
function mockActivity() {
    let site = chance.pick(mockSites);
    let name = chance.word();
    return Activities.newRecord({
        name: 'activity-' + name,
        description: chance.paragraph(),
        icon_url: chance.pick(activityIcons),
        template: {
            web: 'http://www.naturenet.org/activities/' + name,
            ios: 'http://www.naturenet.org/activities/' + name + '-ios',
            andriod: 'http://www.naturenet.org/activities/' + name + '-andriod'
        }
    }).write()
        .then(activity => {
            mockActivities.push(activity)
            let location = locationNear(site.location, 15);
            return activity.addLocation(location, site);
        });
}

var mockUsers = [];

/**
 * Creates a single user with randomized data.
 */
function mockUser() {
    // return request({ uri: 'http://uifaces.com/api/v1/random', json: true })
    //     .then(body => { return body.image_urls.normal; })
    //     .then(url => {
            return Users.signup(chance.word({length: 10}) + '@nature-net.org', "testuser", {
                public: {
                    display_name: chance.word() + ' ' + chance.word(),
                    avatar: "https://s3.amazonaws.com/uifaces/faces/twitter/robertovivancos/128.jpg",
                    affiliation: chance.pick([null, 'ACES', 'NatureNet']),
                    testuser: true
                },
                private: {
                    consent: {
                        record: chance.bool(),
                        survey: chance.bool()
                    }
                }
            }).then(user => { mockUsers.push(user); });
        // });
}

var mockObservations = [];

/**
 * Creates a single observation with randomized data.
 */
function mockObservation() {
    let activity = chance.pick(mockActivities);
    let user = chance.pick(mockUsers);
    return activity.locations().then(list => {
        let location = chance.pick(list);
        return Observations.newRecord({
            activity_location: location.id,
            observer: chance.pick(mockUsers).id(),
            location: locationNear(location.location.l, 2),
            data: {
                foo: 'bar',
                baz: 2,
                ducks: true
            }
        }).write().then(obs => { mockObservations.push(obs) });
    })
}

var mockIdeas = [];

/**
 * Creates a single idea with randomized data.
 */
function mockIdea() {
    let user = chance.pick(mockUsers);
    let group = chance.pick(["Wouldn't it be cool if...", "It would be better if...", "Open Suggestion"]);
    return Ideas.newRecord({
        submitter: chance.pick(mockUsers).id(),
        group: group,
        icon_url: 'http://res.cloudinary.com/university-of-colorado/image/upload/v1427400563/2_FreeObservations_mjzgnh.png',
        content: chance.sentence()
    }).write().then(idea => { mockIdeas.push(idea); });
}

/**
 * Adds a comment to a randomly chosen idea or observation.
 */
function randomlyComment() {
    let user = chance.pick(mockUsers);
    let commentable = chance.pick(mockIdeas.concat(mockObservations));
    return commentable.addComment(chance.sentence(), user);
}

/**
 * Likes or dislikes a randomly chosen idea, observation, or comment.
 */
function randomlyLike() {
    let user = chance.pick(mockUsers);
    let likeable = chance.pick(mockIdeas.concat(mockObservations));

    if (likeable.comments && chance.bool()) {
        let id = chance.pick(Object.keys(likeable.comments));
        if (chance.bool()) {
            return likeable.likeComment(id, user);
        } else {
            return likeable.dislikeComment(id, user);
        }
    } else {
        if (chance.bool()) {
            return likeable.like(user);
        } else {
            return likeable.dislike(user);
        }
    }
}

/**
 * Authenticate using the apps secret key.
 */
function authenticate() {
    return new Promise((resolve, reject) => {
        new Firebase(process.env.FIREBASE_URL).authWithCustomToken(process.env.FIREBASE_SECRET, (error, auth) => {
            if (error) {
                reject(error)
            } else {
                resolve();
            }
        });
    });
}

console.log("Seeding firebase with data");
authenticate()
    .then(ok => cleanDb())
    .then(ok => seedSites())
    .then(ok => repeat(30, mockActivity))
    .then(ok => repeat(30, mockUser))
    .then(ok => repeat(90, mockObservation))    // ave 3 per user
    .then(ok => repeat(20, mockIdea))           // not every user submits an idea
    .then(ok => repeat(200, randomlyComment))   // slightly more then one per commentable
    .then(ok => repeat(200, randomlyLike))
    .then(ok => {
        console.log("Seeding completed successfully")
        process.exit();
    })
    .catch(error => {
        console.log("Seeding failed:");
        console.log(error);
        process.exit();
    });
