"use strict";

const chance = require('chance').Chance();
const should = require('should');
const Firebase = require('firebase')

const Utils = require('../test-utils');
const Sites = require('../../lib/models/site');

const client = new Firebase(process.env.FIREBASE_URL);

describe('/sites', () => {

    describe('permissions', () => {

        context('an unauthenticated client', () => {

            before(() => {
                client.unauth();
            });

            it('can read sites', () => {
                return Sites.root.once('value')
                    then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let site = value[id];
                            should.exist(site.id);
                            id.should.equal(site.id);
                            should.exist(site.name);
                            should.exist(site.description);
                            should.exist(site.location);
                        }
                    });
            });

            it('cannot create sites', done => {
                let site = Sites.newRecord("test", {
                    name: 'TEST',
                    description: "Test site",
                    location: [1, 2]
                })
                site.write()
                    .then(ok => done(new Error("Unauthenticated client could create a site")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot update sites', done => {
                Sites.root.limitToFirst(1).once('value')
                    .then(snapshot => {
                        let id = Object.keys(snapshot.val())[0];
                        return Sites.root.child(id).update({name: 'updated name'});
                    })
                    .then(ok => done(new Error("Unauthenticated client could update a site")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });
        });

        context('an authenticated client', () => {

            const data = Utils.randomUserData();
            var user;

            before(() => {
                return Utils.createAndAuthUser(data.loginData, data.userData, client)
                    .then(created => {
                        user = created;
                    });
            });

            after(() => {
                return Utils.deleteUser(data.loginData, user, client);
            });

            it('can read sites', () => {
                return Sites.root.once('value')
                    then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let site = value[id];
                            should.exist(site.id);
                            id.should.equal(site.id);
                            should.exist(site.name);
                            should.exist(site.description);
                            should.exist(site.location);
                        }
                    });
            });

            it('cannot create sites', done => {
                let site = Sites.newRecord("test", {
                    name: 'TEST',
                    description: "Test site",
                    location: [1, 2]
                })
                site.write()
                    .then(ok => done(new Error("Authenticated client could create a site")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot update sites', done => {
                Sites.root.limitToFirst(1).once('value')
                    .then(snapshot => {
                        let id = Object.keys(snapshot.val())[0];
                        return Sites.root.child(id).update({name: 'updated name'});
                    })
                    .then(ok => done(new Error("Authenticated client could update a site")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });
        });
    });
});
