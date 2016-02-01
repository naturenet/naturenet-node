var should = require('should');
var chance = require('chance').Chance();

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var Idea = require('../../lib/models/idea').Model;
var User = require('../../lib/models/user').Model;

describe('Idea', () => {

    before(done => {
        mongoose.connect(process.env.TEST_DATABASE_URL, done);
    });

    var submitter, commenter;

    before(done => {
        User.signup({email: 'submitter@naturenet.test', password: 'submitter'}, (err, user) => {
            if (err) done(err);
            else {
                submitter = user;
                done();
            }
        });
    });

    before(done => {
        User.signup({email: 'commenter@naturenet.test', password: 'commenter'}, (err, user) => {
            if (err) done(err);
            else {
                commenter = user;
                done();
            }
        });
    });

    after(done => {
        mongoose.connection.db.dropDatabase()
            .then(result => mongoose.connection.close(done))
            .catch(err => done(err));
    });

    describe('basic CRUD', () => {

        it('can create an idea', done => {
            Idea.create({
                submitter: submitter,
                group: "Wouldn't it be cool if tests?",
                content: "yes, yes it would"
            }, (err, idea) => {
                should.not.exist(err);
                idea.submitter.should.equal(submitter);
                idea.group.should.equal("Wouldn't it be cool if tests?");
                idea.content.should.equal("yes, yes it would");
                should.exist(idea.icon_url);
                idea.comments.length.should.equal(0);
                done();
            });
        });

        it('can read an idea', done => {
            Idea.submitted_by(submitter._id)
                .then(ideas => done())
                .catch(error => done(error));
        });

        it('can update an idea', done => {
            Idea.findOne({submitter: submitter}).exec()
                .catch(error => done(error))
                .then(idea => {
                    idea.content = 'I changed my mind';
                    idea.save(err => {
                        if (err) done(err);
                        Idea.findOne({submitter: submitter._id}).exec()
                            .catch(error => done(error))
                            .then(updated => {
                                updated.content.should.equal('I changed my mind');
                                done();
                            });
                    });
                });
        });

        it('can delete an idea', done => {
            Idea.create({
                submitter: submitter,
                group: "Wouldn't it be cool if tests?",
                content: "deleteme"
            }, (err, idea) => {
                should.not.exist(err);
                Idea.remove(idea, err => {
                    if (err) done(err);
                    else done();
                });
            });
        });
    });

    describe('commenting', () => {

        var idea;

        before(done => {
            Idea.create({
                submitter: submitter,
                group: "test",
                content: "foo"
            }, (err, created) => {
                if (err) done(err);
                else {
                    idea = created;
                    done();
                }
            });
        });

        it('can add a comment', done => {
            idea.add_comment(commenter, "testing");
            idea.save()
                .then(result => {
                    result.comments.length.should.equal(1);
                    done();
                }).catch(err => done(err));
        });

        it('can read a comment', done => {
            Idea.findOne({_id: idea._id}).exec()
                .then(found => {
                    found.content.should.equal('foo');
                    found.comments[0].comment.should.equal('testing');
                    done();
                }).catch(err => done(err));
        });

        it('can update a comment', done => {
            idea.comments[0].comment = 'changed';
            idea.save()
                .then(result => {
                    result.comments[0].comment.should.equal('changed');
                    done();
                }).catch(err => done(err));
        });
    });
});
