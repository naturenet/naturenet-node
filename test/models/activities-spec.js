"use strict";

const chance = require('chance').Chance();
const should = require('should');
const Firebase = require('firebase')
const GeoFire = require('geofire');

const Utils = require('../test-utils');
const Activities = require('../../lib/models/activity');
const Sites = require('../../lib/models/site');

const client = new Firebase(process.env.FIREBASE_URL);

describe('/activities', () => {

    describe('permissions', () => {

        context('an unauthenticated client', () => {

            before(() => {
                client.unauth();
            });

            it('can read activities', () => {
                return Activities.root.limitToFirst(5).once('value')
                    then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let activity = value[id];
                            should.exist(activity.id);
                            id.should.equal(activity.id);
                            should.exist(activity.name);
                            should.exist(activity.description);
                            should.exist(activity.icon_url);
                            should.exist(activity.template);
                            activity.template.should.have.properties(['web', 'ios', 'andriod']);
                        }
                    });
            });

            it('cannot create activities', done => {
                let activity = Activities.newRecord({
                    name: 'test activity',
                    description: 'its a test',
                    icon_url: 'http://foo.jpg',
                    template: {
                        web: 'http://www.naturenet.org/activities/test',
                        ios: 'http://www.naturenet.org/activities/test-ios',
                        andriod: 'http://www.naturenet.org/activities/test-android',
                    }
                });
                activity.write()
                    .then(ok => done(new Error("Unauthenticated client could create an activity")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot update activities', done => {
                Activities.first()
                    .then(activity => {
                        activity.name = "updated name";
                        return activity.update();
                    })
                    .then(ok => done(new Error("Unauthenticated client could update an activity")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('can read activity locations', () => {
                return Activities.georef.limitToFirst(5).once('value')
                    .then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let location = value[id];
                            should.exist(location.id);
                            id.should.equal(location.id);
                            should.exist(location.activity);
                            should.exist(location.site);
                            should.exist(location.l);
                            should.exist(location.g);
                        }
                    });
            });

            it('can find activities by site', () => {
                var targetSite;
                return Sites.first()
                    .then(site => {
                        targetSite = site;
                        return Activities.georef.orderByChild('site').equalTo(site.id).once('value');
                    })
                    .then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let location = value[id];
                            location.site.should.equal(targetSite.id);
                        }
                    });
            });

            it('can find activities by location', done => {
                let geofire = new GeoFire(Activities.georef);
                Sites.first()
                    .then(site => {
                        let query = geofire.query({ center: site.l, radius: 50 });
                        let found = [];
                        query.on('key_entered', (key, location, distance) => {
                            let promise = Activities.georef.child(key).once('value')
                                .then(snapshot => {
                                    let location = snapshot.val();
                                    should.exist(location.activity);
                                    return Activities.root.child(location.activity).once('value');
                                })
                                .then(snapshot => {
                                    return snapshot.val();
                                });
                            found.push(promise);
                        });
                        query.on('ready', () => {
                            found.should.not.be.empty();
                            Promise.all(found)
                                .then(values => {
                                    for (var activity of values) {
                                        should.exist(activity.id);
                                        should.exist(activity.name);
                                        should.exist(activity.description);
                                        should.exist(activity.icon_url);
                                        should.exist(activity.template);
                                        activity.template.should.have.properties(['web', 'ios', 'andriod']);
                                    }
                                    query.cancel();
                                    done();
                                })
                                .catch(error => {
                                    query.cancel();
                                    done(error);
                                });
                        });
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

            it('can read activities', () => {
                return Activities.root.limitToFirst(5).once('value')
                    then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let activity = value[id];
                            should.exist(activity.id);
                            id.should.equal(activity.id);
                            should.exist(activity.name);
                            should.exist(activity.description);
                            should.exist(activity.icon_url);
                            should.exist(activity.template);
                            activity.template.should.have.properties(['web', 'ios', 'andriod']);
                        }
                    });
            });

            it('cannot create activities', done => {
                let activity = Activities.newRecord({
                    name: 'test activity',
                    description: 'its a test',
                    icon_url: 'http://foo.jpg',
                    template: {
                        web: 'http://www.naturenet.org/activities/test',
                        ios: 'http://www.naturenet.org/activities/test-ios',
                        andriod: 'http://www.naturenet.org/activities/test-android',
                    }
                });
                activity.write()
                    .then(ok => done(new Error("Unauthenticated client could create an activity")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('cannot update activities', done => {
                Activities.first()
                    .then(activity => {
                        activity.name = "updated name";
                        return activity.update();
                    })
                    .then(ok => done(new Error("Unauthenticated client could update an activity")))
                    .catch(error => {
                        error.code.should.equal('PERMISSION_DENIED');
                        done();
                    });
            });

            it('can read activity locations', () => {
                return Activities.georef.limitToFirst(5).once('value')
                    .then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let location = value[id];
                            should.exist(location.id);
                            id.should.equal(location.id);
                            should.exist(location.activity);
                            should.exist(location.site);
                            should.exist(location.l);
                            should.exist(location.g);
                        }
                    });
            });

            it('can find activities by site', () => {
                var targetSite;
                return Sites.first()
                    .then(site => {
                        targetSite = site;
                        return Activities.georef.orderByChild('site').equalTo(site.id).once('value');
                    })
                    .then(snapshot => {
                        let value = snapshot.val();
                        value.should.not.be.empty();
                        for (var id of Object.keys(value)) {
                            let location = value[id];
                            location.site.should.equal(targetSite.id);
                        }
                    });
            });

            it('can find activities by location', done => {
                let geofire = new GeoFire(Activities.georef);
                Sites.first()
                    .then(site => {
                        let query = geofire.query({ center: site.l, radius: 50 });
                        let found = [];
                        query.on('key_entered', (key, location, distance) => {
                            let promise = Activities.georef.child(key).once('value')
                                .then(snapshot => {
                                    let location = snapshot.val();
                                    should.exist(location.activity);
                                    return Activities.root.child(location.activity).once('value');
                                })
                                .then(snapshot => {
                                    return snapshot.val();
                                });
                            found.push(promise);
                        });
                        query.on('ready', () => {
                            found.should.not.be.empty();
                            Promise.all(found)
                                .then(values => {
                                    for (var activity of values) {
                                        should.exist(activity.id);
                                        should.exist(activity.name);
                                        should.exist(activity.description);
                                        should.exist(activity.icon_url);
                                        should.exist(activity.template);
                                        activity.template.should.have.properties(['web', 'ios', 'andriod']);
                                    }
                                    query.cancel();
                                    done();
                                })
                                .catch(error => {
                                    query.cancel();
                                    done(error);
                                });
                        });
                    });
            });
        });
    });
});

