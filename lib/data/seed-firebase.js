'use strict';
const Firebase = require('firebase');
const GeoFire = require('geofire');
const chance = require('chance').Chance();
const mocks = require('./mocks');
const _ = require('lodash');

var base = new Firebase('https://naturenet-testing.firebaseio.com/');

// setup collections
var users = base.child('users');
var activities = base.child('activities');
var locations = base.child('locations');
var activity_locations = new GeoFire(locations.child('activities'));

// drop existing data
users.remove();
activities.remove();
activity_locations.ref().remove();

// const refKey = Symbol()

// class FirebaseRecord {

//     constructor(ref, properties) {
//         this[refKey] = ref;
//         this.id = ref.key();
//         for(var name in properties) {
//             if (properties.hasOwnProperty(name)) {
//                 this[name] = properties[name];
//             }
//         }
//     }

//     get ref() {
//         return this[refKey];
//     }

//     write() {
//         return this.ref.set(this);
//     }

//     update() {
//         return this.ref.update(this);
//     }

//     delete() {
//         return this.ref.delete();
//     }
// }

// const rootKey = Symbol();

// class FirebaseCollection {

//     constructor(root) {
//         this[rootKey] = root;
//     }

//     get root() {
//         return this[rootKey];
//     }

//     newRecord() {
//         if (arguments.length == 0) {
//             return new FirebaseRecord(this.root.push(), {})
//         }
//         else if (arguments.length == 1) {
//             return new FirebaseRecord(this.root.push(), arguments[0]);
//         } else {
//             return new FirebaseRecord(this.root.child(arguments[0]), arguments[1]);
//         }
//     }

//     deleteAll() {
//         return this.root.remove();
//     }

// }

const Sites = require('../models/site');

Sites.drop()
    .then(ok => {
        let promises = [];

        let test0 = Sites.newRecord();
        test0.name = "test-0";
        test0.location = [0, 0];
        promises.push(test0.write());

        let test1 = Sites.newRecord({name: 'test-1', location: [1, 1]});
        promises.push(test1.write());

        let test2 = Sites.newRecord("test-2", {name: 'test-2', location: [2, 2]});
        promises.push(test2.write());

        return Promise.all(promises)
    })
    .then(ok => {
        console.log("saved ok");
        process.exit();
    })
    .catch(err => {
        console.log(err);
        process.exit();
    })


// collection for all the async writes
// var ops = []

// // no random site creation so setup a few manually
// var aces = sites.push();
// ops.push(aces.set({
//     name: 'ACES',
//     description: 'Aspen Center for Environmental Studies'
// }));
// aces.location = [39.1965355,-106.8242489]
// ops.push(new GeoFire(aces).set("location", aces.location));

// var shirakami = sites.push()
// ops.push(shirakami.set({
//     name: '白神山地',
//     description: "Shirakami National Park"
// }));
// shirakami.location = [41.4163605, 140.2056501]
// ops.push(new GeoFire(shirakami).set("location", shirakami.location));

// var mock_sites = [aces, shirakami];

// // generate activites across the two sites
// var mock_acitivies = [];
// for (var i = 0; i < 30; i++) {
//     let ref = activities.push();
//     mock_acitivies.push(ref);
//     ops.push(mocks.activity(chance.pick(mock_sites), ref, activity_locations));
// }

// // // generate random users
// var mock_users = [];
// for (var i = 0; i < 30; i++) {
//     ops.push(mocks.user(base, users));
// }


// _.forEach(ops, promise => {
//     promise.catch(err => {
//         console.log('a seeding operation failed: ' + err);
//     });
// });

// Promise.all(ops).then(() => {
//     console.log("data writing complete")
//     process.exit();
// })


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



