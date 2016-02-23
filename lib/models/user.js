"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

/**
 * Extension of {@link FirebaseRecord} to delete the authentication record as
 * well as the application user data.
 */
class User extends fb.FirebaseRecord {

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
        return this.ref.child('public').update(this).then(ok => { return this; });
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
