/**
 * @file A set of classes for wrapping raw Firebase references and providing a more
 * ActiveRecord style interface on top of them.
 *
 * @example
 * const fb = require('firebase-classes');
 * const FirebaseCollection = fb.FirebaseCollection;
 * const FirebaseRecord = fb.FirebaseRecord;
 * const Firebase = require('firebase');
 *
 * var sites = new fb.FirebaseCollection(new Firebase("https://naturenet-testing.firebaseio.com"));
 * var aces = sites.newRecord("aces", {name: "ACES", description: "Aspen Center for Environmental Studies"});
 * aces.write();
 */
'use strict';
const Firebase = require('firebase');
const GeoFire = require('geofire');

/** A private symbol for classes to store their underlying reference under. */
const refKey = Symbol('ref');

/**
 * Acts as single record stored in Firebase.
 */
class FirebaseRecord {

    /**
     * Constructs a new unsaved instance from a reference and a set of initial data.
     * Automatically sets a 'id' property based on the `ref.key()`, if one is already
     * present in the initial data it will be *overwritten*.
     *
     * @param {Firebase} ref - The underlying reference where the record will be stored.
     * @param {object} properties - An initial set of data for the record, must be valid
     *                              for storage in Firebase but otherwise unrestricted.
     */
    constructor(ref, properties) {
        this[refKey] = ref;
        this.id = ref.key();
        for(var name in properties) {
            if (properties.hasOwnProperty(name)) {
                this[name] = properties[name];
            }
        }
    }

    /**
     * @return {Firebase} The underlying firebase reference to the storage location.
     */
    get ref() {
        return this[refKey];
    }

    /**
     * Write all data contained in the record to firebase. Equivalent to a `Firebase#set` operation
     * passing in this instance.
     *
     * @return {Promise} A promise for the write operation.
     */
    write() {
        this.created_at = Firebase.ServerValue.TIMESTAMP;
        this.updated_at = Firebase.ServerValue.TIMESTAMP;
        return this.ref.set(this).then(ok => { return this; });
    }

    /**
     * Updates Firebase with the data contained in the record. Equivalent to a `Firebase#update` operation
     * passing in this instance.
     *
     * @return {Promise} A promise for the update operation.
     * @todo No change tracking takes place so this will not necessarily be anymore efficient then `write`
     *       and is only useful if the instance contains only a subset of the stored data.
     *
     */
    update() {
        this.updated_at = Firebase.ServerValue.TIMESTAMP;
        return this.ref.update(this).then(ok => { return this; });
    }

    /**
     * Deletes this record from Firebase. Equivalent to calling `ref.remove()`.
     *
     * @return {Promise} A promise for the delete operation.
     */
    delete() {
        return this.ref.remove();
    }
}

/**
 * A basic extension of {@link FirebaseRecord} that looks for the presence of a 'location'
 * property and saves that data via GeoFire instead.
 *
 * @todo Wrap the double write in a transaction.
 */
class LocationAwareRecord extends FirebaseRecord {

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
                    return this.geofire.set('location', location)
                        .then(ok => { return this; });
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
                    return this.geofire.set('location', location)
                        .then(ok => { return this; });
                });
        }
        return super.update();
    }
}

/** A private symbol for storing the GeoFire reference wrapper under */
const geoRef = Symbol('geofire');

/**
 * Acts as a collection of data in Firebase, can be used to create new {@link FirebaseRecord}
 * instances for saving.
 *
 * @todo Is it worth adding some querying or notification methods as well?
 */
class FirebaseCollection {

    /**
     * Creates the collection at a root Firebase reference.
     *
     * @param {Firebase} root - The underlying reference at which all new records should be created.
     * @param {function} recordClass - A `class` or function to be used as the base of all created records,
     *                                 defaults to {@link FirebaseRecord} if not set.
     */
    constructor(root, recordClass) {
        this.root = root;
        if (recordClass) {
            this.recordClass = recordClass;
        } else {
            this.recordClass = FirebaseRecord;
        }
    }

    /**
     * Creates a new {@link FirebaseRecord} as a child of the collection. Can be called with 1, 2, or 3
     * arguments depending on whether or not a specific id is desired for the record and if there is
     * initial data.
     *
     * @example
     * // Create an empty record with an auto-generated id.
     * collection.newRecord();
     * @example
     * // Create a record with an auto-generated id and data.
     * collection.newRecord({foo: 'bar', baz: 2});
     * @example
     * // Create an empty record with a specific id.
     * collection.newRecord("myID");
     * @example
     * // Create a record with a specific id and data.
     * collection.newRecord("myID", {foo: 'bar', baz: 2});
     */
    newRecord() {
        if (arguments.length == 0) {
            return new this.recordClass(this.root.push(), {})
        }
        else if (arguments.length == 1) {
            return new this.recordClass(this.root.push(), arguments[0]);
        } else {
            return new this.recordClass(this.root.child(arguments[0]), arguments[1]);
        }
    }

    /**
     * Delete all records in this collection.
     *
     * @return {Promise} A promise for the delete operation.
     */
    drop() {
        return this.root.remove();
    }
}

module.exports = {
    FirebaseRecord: FirebaseRecord,
    LocationAwareRecord: LocationAwareRecord,
    FirebaseCollection: FirebaseCollection
};
