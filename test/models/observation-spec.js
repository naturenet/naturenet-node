var should = require('should');
var chance = require('chance').Chance();

var mongoose = require('mongoose');
var User = require('../../lib/models/user').Model;
var Site = require('../../lib/models/site').Model;
var Activity = require('../../lib/models/activity').Model;
var Observation = require('../../lib/models/Observation').Model;

describe('Observation', () => {

    before(done => {
        mongoose.connect(process.env.TEST_DATABASE_URL, done);
    });

    after(done => {
        mongoose.connection.db.dropDatabase()
            .then(result => mongoose.connection.close(done))
            .catch(err => done(err));
    });

    var user, site, activity;

    before(done => {
        User.signup({email: 'observation@naturenet.test', password: 'observation'},
            (err, created) => {
                if (err) done(err);
                else {
                    user = created;
                    done();
                }
            });
    });

    before(done => {
        Site.create({name: 'test-site', description: 'testing 123', location: [10, -10]},
            (err, created) => {
                if (err) done(err);
                else {
                    site = created;
                    done();
                }
            });
    });

    before(done => {
        Activity.create({
                name: 'test-activity',
                sites: [{ site_id: site, location: [20, -20]}],
                description: 'my activity',
                markup: '<section></section>'
            }, (err, created) => {
                if (err) done(err);
                else {
                    activity = created;
                    done();
                }
            });
    });

    describe('basic CRUD', () => {

        it('can create an observation', done => {
            Observation.create({
                activity: { activity_id: activity, site_id: site },
                observer: user,
                location: [1, -2],
                data: { a: 1, foo: 'bar', ducks: true }
            }, (err, observation) => {
                if (err) done(err);
                else {
                    observation.activity.activity_id.should.equal(activity);
                    observation.activity.site_id.should.equal(site);
                    observation.observer.should.equal(user);
                    observation.location.toObject().should.deepEqual([1, -2]);
                    observation.data.should.deepEqual({ a: 1, foo: 'bar', ducks: true });
                    observation.comments.length.should.equal(0);
                    done();
                }
            });
        });

        it('can read an observation', done => {
            Observation.findOne({observer: user}).exec()
                .then(obs => {
                    obs.data.should.deepEqual({ a: 1, foo: 'bar', ducks: true });
                    done();
                }).catch(err => done(err));
        });

        it('can update an observation', done => {
            Observation.findOne({observer: user}).exec()
                .then(obs => {
                    obs.data = { replaced: true };
                    obs.save()
                        .then(saved => {
                            saved.data.should.deepEqual({ replaced: true });
                            done();
                        }).catch(err => done(err));
                }).catch(err => done(err));
        });

        it('can delete an observation', done => {
            Observation.remove({observer: user}, (err, result) => {
                should.not.exist(err);
                done();
            });
        });
    });
});
