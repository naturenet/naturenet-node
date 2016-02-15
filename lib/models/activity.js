"use strict";
const Firebase = require('firebase');
const GeoFire = require('geofire');
const fb = require('./firebase-classes');

const host = new Firebase('https://naturenet-testing.firebaseio.com');
const activity_geo = host.child('geo/activities');

/**
 * Extension of the default {@link FirebaseRecord} class to add location handling.
 */
class Activity extends fb.FirebaseRecord {

    /**
     * Adds a location where this activity is available. Due to how GeoFire queries
     * behave and the fact that an activity may be present at multiple locations it
     * is necessary to save the location data separately to the main activity record.
     *
     * NOTE: Adding a location is a separate write operation to saving or updating the
     *       main Activity record.
     *
     * @param {array} location - An array containing a `[latitude, longitude]` pair.
     * @param {Site} site - The site this location is associated with.
     * @return {Promise} The operation to write the location data.
     */
    addLocation(location, site) {
        let ref = activity_geo.push();
        let geo = new GeoFire(ref);
        return ref.set({ activity: this.id, site: site.id }).then(ok => {
            return geo.set('location', location);
        });
    }
}

/**
 * Extension of the default {@link FirebaseCollection} class to return {@link Activity} instances
 * instead of generic records.
 */
class Activities extends fb.FirebaseCollection {

    /**
     * Identical to `FirebaseCollection#newRecord` but returns {@link Activity} instances.
     */
    newRecord() {
        if (arguments.length == 0) {
            return new Activity(this.root.push(), {})
        }
        else if (arguments.length == 1) {
            return new Activity(this.root.push(), arguments[0]);
        } else {
            return new Activity(this.root.child(arguments[0]), arguments[1]);
        }
    }

    /**
     * Deletes all Activity records as well as the locations collection.
     */
    drop() {
        return Promise.all([super.drop(), activity_geo.remove()]);
    }
}

module.exports = new Activities(host.child('activities'));
