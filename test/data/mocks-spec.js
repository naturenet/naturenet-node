var mongoose = require('mongoose');
var should = require('should');

var mocks = require('../../lib/data/mocks');
var Site = require('../../lib/models/site').Model;

describe('mock data generation', () => {

    before(done => {
        mongoose.connect(process.env.TEST_DATABASE_URL, done);
    });

    after(done => {
        mongoose.connection.db.dropDatabase()
            .then(result => mongoose.connection.close(done))
            .catch(err => done(err));
    });

    var site;

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

    it('should use random avatars', done => {
        mocks.avatar()
            .then(url => {
                url.should.startWith('https://s3.amazonaws.com/uifaces/faces');
                done();
            }).catch(err => done(err));
    });

    var activity;

    it('should create valid activities', done => {
        mocks.activity(site)
            .then(created => {
                activity = created;
                done();
            })
            .catch(err => done(err));
    });

    var user;

    it('should create valid users', done => {
        mocks.user()
            .then(created => {
                user = created;
                done();
            })
            .catch(err => done(err));
    });

    var idea;

    it('should create valid ideas', done => {
        mocks.idea(user)
            .then(created => {
                idea = created;
                done();
            }).catch(err => done(err));
    });

    var observation;

    it('should create valid observations', done => {
        mocks.observation(activity, user)
            .then(created => {
                observation = created;
                done();
            }).catch(err => done(err));
    });

    it('should be able to add valid comments to ideas', done => {
        mocks.comment(idea, user)
            .then(updated => done())
            .catch(err => done(err));
    });

    it('should be able to add valid comments to observations', done => {
        mocks.comment(observation, user)
            .then(updated => done())
            .catch(err => done(err));
    });
});
