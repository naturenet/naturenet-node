"use strict";

const chance = require('chance').Chance();
const should = require('should');
const Firebase = require('firebase')

const Utils = require('../test-utils');
const Users = require('../../lib/models/user');

const client = new Firebase(process.env.FIREBASE_URL);
const clientUser = Utils.randomUserData();
const readableUserData = Utils.randomUserData();
var readableUser;

describe('/users', () => {

    before(() => {
        return client.authWithCustomToken(process.env.FIREBASE_SECRET)
            .then(ok => {
                return Users.signup(readableUserData.loginData.email, readableUserData.loginData.password, readableUserData.userData);
            })
            .then(created => {
                readableUser = created;
            });
    });

    after(() => {
        return Utils.deleteUser(readableUserData.loginData, readableUser, client);
    });

    describe('permissions', () => {

        context('an authenticated user', () => {

            var user;

            before(() => {
                return Utils.createAndAuthUser(clientUser.loginData, clientUser.userData, client)
                    .then(created => {
                        user = created;
                    });
            });

            after(() => {
                return Utils.deleteUser(clientUser.loginData, user, client);
            });

            it('can read their full user record', () => {
                return Users.root.child(user.id() + '/public').once('value')
                    .then(snapshot => {
                        let read = snapshot.val();
                        Utils.equalsExcludingTimestamps(read, user.public);
                        return Users.root.child(user.id() + '/private').once('value')
                    })
                    .then(snapshot => {
                        let read = snapshot.val();
                        Utils.equalsExcludingTimestamps(read, user.private);
                    });
            });

            it('can read other users public records', () => {
                return Users.root.child(readableUser.id() + "/public").once('value')
                    .then(snapshot => {
                        let read = snapshot.val();
                        Utils.equalsExcludingTimestamps(read, readableUser.public);
                    });
            });

            it('cannot read other users private records', done => {
                Users.root.child(readableUser.id() + "/private").once('value')
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    })
                    .then(read => {
                        console.log(read.val());
                        done(new Error("Successfully read another users /private path"));
                    });
            })

            it('can update their own public record', () => {
                user.public.avatar = "https://new-avatar.png";
                user.public.display_name = "TEST USER";
                return user.updatePublic()
                    .then(updated => Utils.equalsExcludingTimestamps(updated.public, user.public));
            });

            it('can update their own private record', () => {
                user.private.consent = {record: true, survey: true};
                return user.updatePrivate()
                    .then(updated => Utils.equalsExcludingTimestamps(updated.private, user.private));
            });

            it('cannot update another users public record', done => {
                let copy = Utils.clone(readableUser);
                readableUser.public.avatar = "modified";
                readableUser.updatePublic()
                    .then(ok => {
                        done(new Error("Successfully updated another users public data"));
                    })
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        readableUser.public = copy.public;
                        done();
                    });
            });

            it('cannot update another users private record', done => {
                let copy = Utils.clone(readableUser);
                readableUser.private.consent = false;
                readableUser.updatePrivate()
                    .then(ok => {
                        done(new Error("Successfully updated another users private data"));
                    })
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        readableUser.private = copy.private;
                        done();
                    });
            });
        });

        context('an unauthenticated client', () => {

            var client = new Firebase(process.env.FIREBASE_URL);

            beforeEach(() => {
                client.unauth();
            })

            it('can read users public records', () => {
                return Users.root.child(readableUser.id() + "/public").once('value')
                    .then(snapshot => {
                        let read = snapshot.val();
                        Utils.equalsExcludingTimestamps(read, readableUser.public);
                    });
            });

            it('cannot read users private records', done => {
                Users.root.child(readableUser.id() + "/private").once('value')
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    })
                    .then(read => {
                        console.log(read.val());
                        done(new Error("Successfully read a users /private path"));
                    });
            });

            it('cannot update a users public record', () => {
                let copy = Utils.clone(readableUser);
                readableUser.public.avatar = "modified";
                readableUser.updatePublic()
                    .then(ok => {
                        done(new Error("Successfully updated another users public data"));
                    })
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        readableUser.public = copy.public;
                        done();
                    });
            });

            it('cannot update a users private record', () => {
                let copy = Utils.clone(readableUser);
                readableUser.private.consent = false;
                readableUser.updatePrivate()
                    .then(ok => {
                        done(new Error("Successfully updated another users private data"));
                    })
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        readableUser.private = copy.private;
                        done();
                    });
            });

            it('can register a new user', () => {
                let data = Utils.randomUserData();
                return client.createUser(data.loginData)
                    .then(ok => {
                        return client.removeUser(data.loginData);
                    });
            });

            it('can create a user record after authentication', () => {
                let data = Utils.randomUserData();
                return client.createUser(data.loginData)
                    .then(auth => {
                        return client.authWithPassword(data.loginData);
                    })
                    .then(auth => {
                        let user = Users.newRecord(auth.uid, data.userData);
                        user.private.email = data.loginData.email;
                        return user.write();
                    })
                    .then(user => {
                        return Utils.deleteUser(data.loginData, user, client);
                    });
            });
        });
    });

    // NOTE: validations are skipped for admin clients.
    describe('validations', () => {

        const data = Utils.randomUserData();
        var authId;

        before(() => {
            return client.createUser(data.loginData)
                .then(ok => {
                    return client.authWithPassword(data.loginData);
                })
                .then(auth => {
                    authId = auth.uid;
                    // normally setup buy `Users.signup` but we're not using that here
                    data.userData.private.email = data.loginData.email;
                });
        });

        after(() => {
            return client.removeUser(data.loginData);
        })

        it("must include an `id` field equal to its auth id", done => {
            let user = Users.newRecord(authId, data.userData);
            user.public.id = "not the auth id";
            user.write()
                .then(ok => done(new Error("wrote with a bad key")))
                .catch(error => {
                    error.code.should.equal('PERMISSION_DENIED');
                    done();
                });
        });

        it("cannot be submitted with additional public data", done => {
            let user = Users.newRecord(authId, data.userData);
            user.public.extra = "hello";
            user.write()
                .then(ok => done(new Error("wrote with extra public data")))
                .catch(error => {
                    error.code.should.equal('PERMISSION_DENIED');
                    done();
                });
        });

        it("cannot be submitted with additional private data", done => {
            let user = Users.newRecord(authId, data.userData);
            user.private.extra = "hello";
            user.write()
                .then(ok => done(new Error("wrote with extra private data")))
                .catch(error => {
                    error.code.should.equal('PERMISSION_DENIED');
                    done();
                });
        });

        it("cannot be submitted with additional root data", done => {
            let user = Users.newRecord(authId, data.userData);
            user.extra = "hello";
            user.write()
                .then(ok => done(new Error("wrote with extra root data")))
                .catch(error => {
                    error.code.should.equal('PERMISSION_DENIED');
                    done();
                });
        });

        describe("missing data", () => {

            it('cannot be missing private/email', done => {
                let user = Users.newRecord(authId, data.userData);
                delete user.private.email;
                user.write()
                    .then(ok => done(new Error("wrote with missing private data")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot be missing private/consent', done => {
                let user = Users.newRecord(authId, data.userData);
                delete user.private.consent;
                user.write()
                    .then(ok => done(new Error("wrote with missing private data")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot be missing public/avatar', done => {
                let user = Users.newRecord(authId, data.userData);
                delete user.public.avatar;
                user.write()
                    .then(ok => done(new Error("wrote with missing public data")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot be missing public/display_name', done => {
                let user = Users.newRecord(authId, data.userData);
                delete user.public.display_name;
                user.write()
                    .then(ok => done(new Error("wrote with missing public data")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot be missing public/timestamps', done => {
                let user = Users.newRecord(authId, data.userData);
                delete user.public.created_at;
                delete user.public.updated_at;
                user.write()
                    .then(ok => done(new Error("wrote with missing public data")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot be missing public/id', done => {
                let user = Users.newRecord(authId, data.userData);
                delete user.public.id;
                user.write()
                    .then(ok => done(new Error("wrote with missing public data")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });
        });
    });
});
