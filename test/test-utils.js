"use strict";
const chance = require('chance').Chance();
const should = require('should');

const Users = require('../lib/models/user');

class TestUtils {

    /**
     * Generates a set of data for creating a random user in the system. Will return
     * an object structed as:
     * @example
     * {
     *      loginData: { email: "...", password: "..."},
     *      userData: { (other values) }
     * }
     *
     * @return {object} Randomly created user and login data.
     */
    static randomUserData() {
        return {
            loginData: {
                email: `testuser-${chance.word({length: 10})}@nature-net.org`,
                password: 'testuser'
            },
            userData: {
                public: {
                    avatar: "https://s3.amazonaws.com/uifaces/faces/twitter/robertovivancos/128.jpg",
                    display_name: "Test User",
                    testuser: true
                },
                private: {
                    consent: {
                        survey: chance.bool(),
                        record: chance.bool()
                    }
                }
            }
        }
    }

    /**
     * Creates a new {@link User} record using the provided client. After creation
     * the client is authenticated as the user.
     *
     * NOTE: Signup and auth can easily go over the 2s default test timeout.
     *
     * @param {object} loginData - email/password pair for the user.
     * @param {object} userData - all other data for the user record.
     * @param {Firebase} client - the firebase client to use for the create operation.
     * @return {Promise} - a promise for the combined create and auth.
     */
    static createAndAuthUser(loginData, userData, client) {
        return client.authWithCustomToken(process.env.FIREBASE_SECRET)
            .then(ok => {
                return Users.signup(loginData.email, loginData.password, userData);
            })
            .then(user => {
                return new Promise((resolve, reject) => {
                    client.authWithPassword(loginData, (error, auth) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(user);
                        }
                    });
                });
            });
    }

    /**
     * Deletes a user. This function with first authenticate the client using the app
     * secret and then unauthenticate the client completely.
     *
     * @param {object} loginData - email/password pair for the user.
     * @param {User} user - the user record.
     * @param {Firebase} client - the firebase client to use for the delete operation.
     * @return {Promise} - a promise for the delete operation.
     */
    static deleteUser(loginData, user, client) {
        return new Promise((resolve, reject) => {
            client.authWithCustomToken(process.env.FIREBASE_SECRET, (error, auth) => {
                if (error) {
                    console.log("failed to cleanup test user: " + JSON.stringify(loginData));
                    reject("failed to authenticate before delete: " + error);
                } else {
                    user.delete(loginData.password)
                        .then(ok => {
                            client.unauth();
                            resolve();
                        })
                        .catch(error => {
                            console.log("failed to cleanup test user: " + JSON.stringify(loginData));
                            client.unauth();
                            reject(error);
                        });
                }
            });
        });
    }

    /**
     * @return {object} a clone of a data object.
     */
    static clone(obj) {
        let data = JSON.parse(JSON.stringify(obj));
        let proto = Object.getPrototypeOf(obj);
        let copy = Object.create(proto);
        for (var name of Object.getOwnPropertyNames(obj)) {
            copy[name] = data[name];
        }
        return copy;
    }

    /**
     * Does a `should.deepEqual` assertion on the input after removing the
     * timestamp data.
     */
    static equalsExcludingTimestamps(expected, actual) {
        let left = this.clone(expected);
        delete left.created_at;
        delete left.updated_at;
        let right = this.clone(actual);
        delete right.created_at;
        delete right.updated_at;
        left.should.deepEqual(right);
    }
}



module.exports = TestUtils;

