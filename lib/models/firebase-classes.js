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
 * var sites = new fb.FirebaseCollection(new Firebase(process.env.FIREBASE_URL + "/sites"));
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
        this.timestamp(true);
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
        this.timestamp();
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

    /**
     * Sets the timestamp values for this record so they will be updated with the server time
     * in Firebase.
     *
     * @param {boolean} created - Set the `created_at` timestamp as well.
     */
    timestamp(created) {
        if (created) {
            this.created_at = Firebase.ServerValue.TIMESTAMP;
        }
        this.updated_at = Firebase.ServerValue.TIMESTAMP;
    }

    toString() {
        return JSON.stringify(this, null, '  ');
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
     * If location data is present first writes the location data using GeoFire,
     * since that write will clobber other data, then writes the main data normally.
     */
    write() {
        let location = this.location;
        delete this.location;   // so we don't double-save the data
        if (location) {
            let geofire = new GeoFire(this.ref.parent());
            return geofire.set(this.ref.key(), location)
                .then(ok => { return super.update(); })
                .then(ok => {
                    // re-save the location for local access
                    this.location = location;
                    return this;
                });
        }
        return super.write();
    }

    /**
     * Delegates up to write because GeoFire does not support an `update` method.
     */
    update() {
        return write();
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

    /**
     * Returns the first record stored in the collection based on the implicit
     * or priority ordering configured in Firebase.
     *
     * @return {Promise} A promise for the read, will resolve to a single record.
     */
    first() {
        return this.root.limitToFirst(1).once('value')
            .then(snapshot => {
                let data = snapshot.val();
                let id = Object.keys(data)[0];
                if (!id) {
                    throw new Error("No data returned");
                }
                return this.newRecord(id, data[id]);
            });
    }
}

/**
 * Mixes in 'like' functionality to any other class. Stores likes as a nested
 * object under the 'likes' key in the parent. The structure of the object will
 * be as follows:
 *
 * @example
 * likes: {
 *      // this user liked the record
 *      "abdcefg-12345": true,
 *      // this user disliked the record
 *      "hijklmn-67890": false
 * }
 */
const Likeable = (RecordClass) => class extends RecordClass {

    /**
     * Marks the record as 'liked' by a user.
     *
     * @param {User} user - The user doing the liking.
     * @return {Promise} A promise for the write.
     */
    like(user) {
        let likesRef = this.ref.child('likes');
        let data = {};
        data[user.id()] = true;
        return likesRef.update(data)
            .then(ok => {
                if (!this.likes) {
                    this.likes = {};
                }
                this.likes[user.id()] = true;
                return this;
            });
    }

    /**
     * Marks the record as 'disliked' by a user.
     *
     * @param {User} user - The user doing the disliking.
     * @return {Promise} A promise for the write.
     */
    dislike(user) {
        let likesRef = this.ref.child('likes');
        let data = {};
        data[user.id()] = false;
        return likesRef.update(data)
            .then(ok => {
                if (!this.likes) {
                    this.likes = {};
                }
                this.likes[user.id()] = false;
                return this;
            });
    }

}

/**
 * Mixes in comment functionality to any other class. Stores comments as a nested
 * list of auto-id objects under a 'comments' key in the parent. Individual comments
 * can be 'liked' following the same structure as other {@link Likeable} records.
 */
const Commentable = (RecordClass) => class extends RecordClass {

    /**
     * Add a new comment to the record.
     *
     * @param {string} comment - The content of the comment.
     * @param {object} user - The user making the comment.
     * @return {Promise} A promise for the write operation.
     */
    addComment(comment, user) {
        let commentRef = this.ref.child('comments').push();
        return commentRef.set({
            comment: comment,
            commenter: user.id(),
            updated_at: Firebase.ServerValue.TIMESTAMP,
            created_at: Firebase.ServerValue.TIMESTAMP
        }).then(ok => {
            if (!this.comments) {
                this.comments = {};
            }
            this.comments[commentRef.key()] = {
                comment: comment,
                commenter: user.id()
            };
            return this;
        });
    }

    /**
     * Marks a comment as 'liked' by a user.
     *
     * @param {string} commentId - The id of the comment to like.
     * @param {User} user - The user doing the liking.
     * @return {Promise} A promise for the write.
     */
    likeComment(commentId, user) {
        let likesRef = this.ref.child(`comments/${commentId}/likes`);
        let data = {};
        data[user.id()] = true;
        return likesRef.update(data)
            .then(ok => {
                if (!this.comments[commentId].likes) {
                    this.comments[commentId].likes = {};
                }
                this.comments[commentId].likes[user.id()] = true;
                return this;
            });
    }

    /**
     * Marks comment as 'disliked' by a user.
     *
     * @param {string} commentId - The id of the comment to dislike.
     * @param {User} user - The user doing the disliking.
     * @return {Promise} A promise for the write.
     */
    dislikeComment(commentId, user) {
        let likesRef = this.ref.child(`comments/${commentId}/likes`);
        let data = {};
        data[user.id()] = false;
        return likesRef.update(data)
            .then(ok => {
                if (!this.comments[commentId].likes) {
                    this.comments[commentId].likes = {};
                }
                this.comments[commentId].likes[user.id()] = false;
                return this;
            });
    }
}

module.exports = {
    FirebaseRecord: FirebaseRecord,
    LocationAwareRecord: LocationAwareRecord,
    Commentable: Commentable,
    Likeable: Likeable,
    FirebaseCollection: FirebaseCollection
};
