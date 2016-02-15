"use strict";
const Firebase = require('firebase');
const GeoFire = require('geofire');
const fb = require('./firebase-classes');

/** A private symbol for storing the GeoFire reference wrapper under */
const geoRef = Symbol('geofire');

/**
 * Extension of the default {@link FirebaseRecord} class to add location handling.
 */
class Site extends fb.FirebaseRecord {

    /**
     * @return {GeoFire} The GeoFire wrapper around the base reference.
     */
    get geofire() {
        if (!this[geoRef]) {
            this[geoRef] = new GeoFire(this.ref);
        }
        return this[geoRef];
    }

    /**
     * If location data is present first writes all other data normally then
     * uses the `geofire` wrapper to set the location data.
     */
    write() {
        let location = this.location;
        if (location) {
            delete this.location;
            return super.write().then(ok => {
                    return this.geofire.set('location', location);
                });
        }
        return super.write();
    }

    /**
     * If location data is present first updates all other data normally then
     * uses the `geofire` wrapper to set the location data.
     */
    update() {
        let location = this.location;
        if (location) {
            delete this.location;
            return super.update().then(ok => {
                    return this.geofire.set('location', location);
                });
        }
        return super.update();
    }
}

/**
 * Extension of the default {@link FirebaseCollection} class to return {@link Site} instances
 * instead of generic records.
 */
class Sites extends fb.FirebaseCollection {

    /**
     * Identical to `FirebaseCollection#newRecord` but returns {@link Site} instances.
     */
    newRecord() {
        if (arguments.length == 0) {
            return new Site(this.root.push(), {})
        }
        else if (arguments.length == 1) {
            return new Site(this.root.push(), arguments[0]);
        } else {
            return new Site(this.root.child(arguments[0]), arguments[1]);
        }
    }
}

module.exports = new Sites(new Firebase('https://naturenet-testing.firebaseio.com/sites'));
