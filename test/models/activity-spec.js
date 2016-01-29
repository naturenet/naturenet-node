var should = require('should');
var chance = require('chance').Chance();

var mongoose = require('mongoose');
var Site = require('../../lib/models/site').Model;
var Activity = require('../../lib/models/activity').Model;

describe('Activity', () => {

    before(done => {
        mongoose.connect(process.env.DATABASE_URL, done);
    });

    after(done => {
        mongoose.connection.db.dropDatabase()
            .then(result => mongoose.connection.close(done))
            .catch(err => done(err));
    });

    describe('basic CRUD', () => {

        var testSite;

        before(done => {
            testSite = Site.create({name: 'test-site', description: 'testing 123', location: [10, -10]},
                (err, site) => {
                    if (err) done(err);
                    else {
                        testSite = site;
                        done();
                    }
                });
        });

        it('can create an activity', done => {
            Activity.create({
                name: 'test-activity',
                sites: [{ site_id: testSite._id, location: [20, -20]}],
                description: 'my activity',
                markup: '<section></section>'
            }, (err, activity) => {
                should.not.exist(err);
                activity.name.should.equal('test-activity');
                activity.description.should.equal('my activity');
                should.exist(activity.icon_url);
                activity.markup.should.equal('<section></section>');

                var site = activity.sites[0];
                should.exist(site);
                site.site_id.should.equal(testSite._id);
                site.location.toObject().should.deepEqual([20, -20]);
                done();
            });
        });

        it('can read an activity', done => {
            Activity.findOne({ name: 'test-activity' }, (err, activity) => {
                should.not.exist(err);
                activity.name.should.equal('test-activity');
                done();
            });
        });
    });
});
