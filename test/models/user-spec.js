var should = require('should');
var chance = require('chance').Chance();

var mongoose = require('mongoose');
var User = require('../../lib/models/user').Model;

describe("User model", function () {

    before(function (done) {
        mongoose.connect(process.env.DATABASE_URL, done);
    });

    after(function (done) {
        mongoose.connection.close(done);
    })

    afterEach(function (done) {
        User.remove(done);
    });

    describe("signup", function() {

        it("should create a user with the submitted data", function(done) {
            User.signup({
                email: chance.word() + '@naturenet.org',
                password: 'password',
            }, done);
        });

        it("should not store the plaintext password", function(done) {
            User.signup({
                email: chance.word() + '@naturenet.org',
                password: 'password',
            }, function (err, user) {
                user.should.have.property('password');
                user.password.should.not.match(/password/);
                done();
            });
        });

        it("should assign a display name based on email if not provided", function(done) {
           User.signup({
                email: 'test@naturenet.org',
                password: 'password',
            }, function (err, user) {
                user.should.have.property('display_name');
                user.display_name.should.equal('test');
                done();
            });
        });

        it("should fail if the model is missing required data", function(done) {
            User.signup({
                password: 'password'
            }, function (err, user) {
                err.should.exist;
                done();
            });
        });
    });

});

