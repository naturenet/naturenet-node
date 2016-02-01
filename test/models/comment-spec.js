var should = require('should');
var chance = require('chance').Chance();
var cases = require('cases');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var Idea = require('../../lib/models/idea').Model;
var Observation = require('../../lib/models/observation').Model;
var Site = require('../../lib/models/site').Model;
var Activity = require('../../lib/models/activity').Model;
var User = require('../../lib/models/user').Model;

describe('Comments', () => {

    before(done => {
        mongoose.connect(process.env.TEST_DATABASE_URL, done);
    });

    var data = {}

    before(done => {
        User.signup({email: 'submitter@naturenet.test', password: 'submitter'}, (err, user) => {
            if (err) done(err);
            else {
                data.submitter = user;
                done();
            }
        });
    });

    before(done => {
        User.signup({email: 'commenter@naturenet.test', password: 'commenter'}, (err, user) => {
            if (err) done(err);
            else {
                data.commenter = user;
                done();
            }
        });
    });

    before(done => {
            Idea.create({submitter: data.submitter, group: "test", content: "foo"}, (err, created) => {
                if (err) done(err);
                else {
                    data.idea = created;
                    done();
                }
            });
        });

    before(done => {
        Site.create({name: 'test-site', description: 'testing 123', location: [10, -10]},
            (err, created) => {
                if (err) done(err);
                else {
                    data.site = created;
                    done();
                }
            });
    });

    before(done => {
        Activity.create({
                name: 'test-activity',
                sites: [{ site_id: data.site, location: [20, -20]}],
                description: 'my activity',
                markup: '<section></section>'
            }, (err, created) => {
                if (err) done(err);
                else {
                    data.activity = created;
                    done();
                }
            });
    });

    before(done => {
        Observation.create({
            activity: { activity_id: data.activity, site_id: data.site },
            observer: data.submitter,
            location: [1, -2],
            data: { a: 1, foo: 'bar', ducks: true }
        }, (err, created) => {
            if (err) done(err);
            else {
                data.observation = created;
                done();
            }
        });
    });

    after(done => {
        mongoose.connection.db.dropDatabase()
            .then(result => mongoose.connection.close(done))
            .catch(err => done(err));
    });

    function models () {
        // need to double-wrap the values behind an accessor function since cases
        // has a bug where it loads the data before the 'before' methods run so
        // we just get undefined values if we use them directly.
        return [
            [() => { return data.idea; }],
            [() => { return data.observation; }]
        ];
    }

    describe('basic CRUD', () => {

        it('can add comments', cases(models, (accessor, done) => {
            var model = accessor();
            model.add_comment(data.commenter, "comment");
            model.save((err, saved) => {
                if (err) done(err);
                saved.comments.length.should.equal(1);
                saved.comments[0].comment.should.equal('comment');
                saved.comments[0].commenter.should.equal(data.commenter);
                done();
            })
        }));

        it('can update comments', cases(models, (accessor, done) => {
            var model = accessor();
            model.comments[0].comment = 'updated';
            model.save((err, saved) => {
                if (err) done(err);
                saved.comments[0].comment.should.equal('updated');
                done();
            });
        }));

        it('can delete comments', cases(models, (accessor, done) => {
            var model = accessor();
            model.comments[0].comment = 'updated';
            model.save((err, saved) => {
                if (err) done(err);
                saved.comments[0].comment.should.equal('updated');
                done();
            });
        }));
    })

});
