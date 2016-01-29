var should = require('should');
var chance = require('chance').Chance();

var mongoose = require('mongoose');
var User = require('../../lib/models/user').Model;

function random_user_data () {
    return {
        display_name: chance.word(),
        password: chance.word(),
        email: `${chance.word()}-test@nature-net.org`,
        avatar_url: "https://s3.amazonaws.com/uifaces/faces/twitter/justinrhee/128.jpg",
        consent_text: chance.paragraph(),
        affiliation: chance.pick(["NatureNet"])
    };
}

function with_user (callback) {
    User.signup(random_user_data(), callback);
}

describe("User", () => {

    before(done => {
        mongoose.connect(process.env.DATABASE_URL, done);
    });

    after(done => {
        mongoose.connection.db.dropDatabase()
            .then(result => mongoose.connection.close(done))
            .catch(err => done(err));
    });

    describe("signup", () => {

        it("should create a user with the submitted data", done => {
            var data = random_user_data();
            User.signup(data,
            (err, user) => {
                should.not.exist(err);
                delete data.password;
                for (var prop in data) {
                    user.should.have.property(prop, data[prop]);
                }
                done();
            });
        });

        it("should not store the plaintext password", done => {
            var data = random_user_data();
            data.password = 'password';
            User.signup(data,
            (err, user) => {
                should.not.exist(err);
                user.should.have.property('password');
                user.password.should.not.match(/password/);
                done();
            });
        });

        it("should assign a display name based on email if not provided", done => {
            var data = random_user_data();
            delete data.display_name;
            User.signup(data,
            (err, user) => {
                should.not.exist(err);
                user.should.have.property('display_name');
                user.email.should.startWith(user.display_name);
                done();
            });
        });

        it("should fail if the model is missing required data", done => {
            var data = random_user_data();
            delete data.password;
            delete data.email;
            User.signup(data,
            (err, user) => {
                should.exist(err);
                done();
            });
        });
    });

    describe("updates", () => {

        it("should rehash passwords if they are changed", done => {
            with_user((err, user) => {
                should.not.exist(err);
                var old = user.password;
                var updated = chance.word();
                user.password = updated;
                user.save((err, user) => {
                    should.not.exist(err);
                    user.password.should.not.equal(old);
                    user.password.should.not.match(new RegExp(updated));
                    done();
                });
            });
        });
    });

    describe("serialization", () => {

        it("should not include the password in JSON", done => {
            with_user((err, user) => {
                should.not.exist(err);
                user.toJSON().should.not.have.property('password');
                done();
            })
        });

        it("should not include the consent text in JSON", done => {
            with_user((err, user) => {
                should.not.exist(err);
                user.toJSON().should.not.have.property('consent_text');
                done();
            })
        });
    });

});

