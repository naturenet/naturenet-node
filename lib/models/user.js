"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');
const user_private = require('./user-private');

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
        this.id = ref.key();
    }

    /**
     * @return {string} The id of this user pulled from the public sub-path.
     */
    id() {
        return this.id;
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
     * Updates the public sub-path of this user record.
     *
     * @return {Promise} A promise for the update operation.
     *
     */
    updatePublic() {
        this.timestamp();
        return this.ref.update(this).then(ok => { return this; });
    }

    /**
     * Overrides the timestamp function to store the values
     */
    timestamp(created) {
        if (created) {
            this.created_at = Firebase.ServerValue.TIMESTAMP;
        }
        this.updated_at = Firebase.ServerValue.TIMESTAMP;
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
     * NOTE: The `signup` convenience method will only work if the client has admin privileges
     * due to the security rules on the `/users` collection. To do signup otherwise you must
     * authenticate the client as the new user in between the `createUser` and `user.write()`
     * calls.
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
            user_private.newRecord(auth.uid, { consent: true }).write();
            return this.newRecord(auth.uid, properties).write();
        });
    }
}

const users = new Users(new Firebase(process.env.FIREBASE_URL + '/users'));
users.recordClass = User;
module.exports = users;
