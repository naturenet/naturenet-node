"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

/**
 * Extension of {@link FirebaseRecord} to delete the authentication record as
 * well as the application user data.
 */
class User extends fb.FirebaseRecord {

    /**
     * Override the constructor to save `id` in the public subpath instead.
     */
    constructor(ref, properties) {
        super(ref, properties);
        delete this.id;
        this.public.id = ref.key();
    }

    /**
     * @return {string} The id of this user pulled from the public sub-path.
     */
    id() {
        return this.public.id;
    }

    /**
     * Deletes the authentication record for this user then deletes the main application
     * data.
     *
     * @return {Promise} A promise for the delete operation.
     */
    delete(password) {
        return this.ref.removeUser({
            email: this.private.email,
            password: password
        })
        .then(ok => {
            return super.delete;
        });
    }

    /**
     * Overrides write to do a split write to the public/private paths instead
     * a single write to root which the security rules would deny.
     *
     * @return {Promise} A promise for the write operation.
     * @todo wrap the split write in a transaction.
     */
    write() {
        this.timestamp(true);
        let privateRef = this.ref.child('private');
        let publicRef = this.ref.child('public');
        return privateRef.set(this.private)
            .then(ok => {
                return publicRef.set(this.public);
            })
            .then(ok => {
                return this;
            });
    }

    /**
     * Updates the public sub-path of this user record.
     *
     * @return {Promise} A promise for the update operation.
     *
     */
    updatePublic() {
        this.timestamp();
        return this.ref.child('public').update(this).then(ok => { return this; });
    }

    /**
     * Updates the public sub-path of this user record.
     *
     * @return {Promise} A promise for the update operation.
     *
     */
    updatePrivate() {
        this.timestamp();
        return this.ref.child('private').update(this).then(ok => { return this; });
    }

    /**
     * Overrides the timestamp function to store the values under `/public`.
     */
    timestamp(created) {
        if (created) {
            this.public.created_at = Firebase.ServerValue.TIMESTAMP;
        }
        this.public.updated_at = Firebase.ServerValue.TIMESTAMP;
    }
}

/**
 * Extension of {@link FirebaseCollection} to add a signup utility method for
 * email/password users that creates both the authentication data and the application
 * record.
 */
class Users extends fb.FirebaseCollection {

    /**
     * Sign up a user using an email/password combination instead of a third party
     * provider. The email address will be added to the properties data before saving,
     * if an email is already present in the properties object it will be overwritten.
     *
     * @param {string} email - the users email address.
     * @param {string} password - the users desired passed.
     * @param {object} properties - the application user data.
     * @return {Promise} A promise for the signup operation.
     */
    signup(email, password, properties) {
        return this.root.createUser({
            email: email,
            password: password
        })
        .then(auth => {
            properties.private.email = email;
            return this.newRecord(auth.uid, properties).write();
        });
    }
}

const users = new Users(new Firebase(process.env.FIREBASE_URL + '/users'));
users.recordClass = User;
module.exports = users;
