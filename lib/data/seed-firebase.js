'use strict';
const Firebase = require('firebase');
const GeoFire = require('geofire');
const chance = require('chance').Chance();
const mocks = require('./mocks');
const _ = require('lodash');

var base = new Firebase('https://naturenet-testing.firebaseio.com/');

// setup collections
var sites = base.child('sites');
var activities = base.child('activities');
var users = base.child('users');
var locations = base.child('locations');
var activity_locations = new GeoFire(locations.child('activities'));

// drop existing data
sites.remove();
activities.remove();
activity_locations.ref().remove();

// collection for all the async writes
var ops = []

// no random site creation so setup a few manually
var aces = sites.push();
ops.push(aces.set({
    name: 'ACES',
    description: 'Aspen Center for Environmental Studies'
}));
aces.location = [39.1965355,-106.8242489]
ops.push(new GeoFire(aces).set("location", aces.location));

var shirakami = sites.push()
ops.push(shirakami.set({
    name: '白神山地',
    description: "Shirakami National Park"
}));
shirakami.location = [41.4163605, 140.2056501]
ops.push(new GeoFire(shirakami).set("location", shirakami.location));

var mock_sites = [aces, shirakami];

// generate activites across the two sites
var mock_acitivies = [];
for (var i = 0; i < 30; i++) {
    let ref = activities.push();
    mock_acitivies.push(ref);
    ops.push(mocks.activity(chance.pick(mock_sites), ref, activity_locations));
}

// generate random users
var mock_users = [];
for (var i = 0; i < 30; i++) {
    let ref = users.push();
    mock_users.push(ref);
    ops.push(mocks.user(base, ref));
}


_.forEach(ops, promise => {
    promise.catch(err => {
        console.log('a seeding operation failed: ' + err);
    });
});

Promise.all(ops).then(() => {
    console.log("data writing complete")
    process.exit();
})


// > var geo = new GeoFire(fb.child('locations/activities'))
// undefined
// > var query = geo.query({center: [39.1965355,-106.8242489], radius: 4000 })
// undefined
// > FIREBASE WARNING: Using an unspecified index. Consider adding ".indexOn": "g" at /locations/activities to your security rules for better performance
// FIREBASE WARNING: Using an unspecified index. Consider adding ".indexOn": "g" at /locations/activities to your security rules for better performance

// >
// > query.on('key_entered', (key, loc, dist) => {console.log('Added: ' + key + ' - ' + loc + ' - ' + dist)})
// Added: -KAJ2GdiUAuQEEvDWova - 39.18349,-106.8217 - 1.4671319026286982
// { cancel: [Function] }
// > query.on('key_moved', (key, loc, dist) => {console.log('Moved: ' + key + ' - ' + loc + ' - ' + dist)})
// { cancel: [Function] }



