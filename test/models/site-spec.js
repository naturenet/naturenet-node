var should = require('should');
var chance = require('chance').Chance();

var mongoose = require('mongoose');
var Site = require('../../lib/models/site').Model;

describe('Site', () => {

    before(done => {
        mongoose.connect(process.env.DATABASE_URL, done);
    });

    after(done => {
        mongoose.connection.db.dropDatabase()
            .then(result => mongoose.connection.close(done))
            .catch(err => done(err));
    });

    describe('basic CRUD', () => {

        it('can create a site', done => {
            Site.create({name: 'test-site', description: 'testing 123', location: [10, -10]},
                (err, site) => {
                    should.not.exist(err);
                    site.name.should.equal('test-site');
                    site.description.should.equal('testing 123');
                    site.location.toObject().should.deepEqual([10, -10]);
                    done();
            });
        });

        it('can read the site back', done => {
            Site.findOne({name: 'test-site'}, (err, site) => {
                should.not.exist(err);
                site.name.should.equal('test-site');
                done();
            });
        });
    });
});
