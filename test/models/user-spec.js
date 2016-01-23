var should = require('should');
var chance = require('chance').Chance();

var mongoose = require('mongoose');
var User = require('../../lib/models/user').Model;

describe("User model", () => {

    before( done => {
        mongoose.connect(process.env.DATABASE_URL, done);
    });

    after( done => {
        User.remove( (err, count) => {
            if (err) {
                throw err;
            }
            mongoose.connection.close(done);
        });
    })

    describe("signup", () => {

        it("should create a user with the submitted data", done => {
            User.signup({
                email: `${chance.word()}@naturenet.org`,
                password: 'password',
            }, done);
        });

        it("should not store the plaintext password", done => {
            User.signup({
                email: `${chance.word()}@naturenet.org`,
                password: 'password',
            },
            (err, user) => {
                should.not.exist(err);
                user.should.have.property('password');
                user.password.should.not.match(/password/);
                done();
            });
        });

        it("should assign a display name based on email if not provided", done => {
            var name = chance.word();
            User.signup({
                email: `${name}@naturenet.org`,
                password: 'password',
            },
            (err, user) => {
                should.not.exist(err);
                user.should.have.property('display_name');
                user.display_name.should.equal(name);
                done();
            });
        });

        it("should fail if the model is missing required data", done => {
            User.signup({
                password: 'password'
            },
            (err, user) => {
                err.should.exist;
                done();
            });
        });
    });

});

