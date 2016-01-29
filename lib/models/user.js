var mongoose = require('mongoose');
var unique = require('mongoose-unique-validator');
var validate = require('mongoose-validate');
var bcrypt = require('bcrypt');

var schema = new mongoose.Schema({
    display_name:   { type: String,     required: false },
    account_type:   { type: String,     required: true,     enum: ['NatureNet'],    default: 'NatureNet' },
    password:       { type: String,     required: true,     match: [ /\$2[aby]\$10\$[a-zA-z0-9\+\.\/=]{53}/, "Password does not appear to be a bcrypt hash"] },
    email:          { type: String,     required: true,     unique: true,           validate: [validate.email, 'invalid email address'] },
    avatar_url:     { type: String,     required: false },
    consent_text:   { type: String,     required: false },
    affiliation:    { type: String,     required: false }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.plugin(unique);

var serialize_options = {
    hidden: ['password', 'consent_text'],

    /**
     * Transformation function called after the conversion of any document to
     * an regular object or before JSON serialization. Filters out any properties
     * in the 'hidden' array declared above.
     *
     * @param {object} doc - the full mongoose document.
     * @param {object} obj - the plain object representation of the document.
     * @param {object} options - the options object attached to the schema or
     *                           passed inline with the toX call.
     */
    transform: (doc, obj, options) => {
        options.hidden.forEach(key => {
            delete obj[key];
        });
    }
};

schema.options.toObject = serialize_options
schema.options.toJSON = serialize_options

/**
 * Hashes a plaintext password.
 *
 * @param {string} plaintext - The password submitted by the user.
 */
function hash_password (plaintext) {
    if (!plaintext || typeof plaintext != 'string') {
        return; // let the model fail validation
    }
    return bcrypt.hashSync(plaintext, 10);
}

/**
 * Compares a plaintext password to the stored hash.
 *
 * @param {string} submitted - The password submitted by the user.
 */
schema.methods.compare_password = function (submitted) {
    if (!submitted) {
        return false;
    }
    return bcrypt.compareSync(submitted, this.password);
};

/**
 * Computes a default `display_name` for a user based on their email address
 * if one is not provided.
 */
schema.pre('save', function (next) {
    if (!this.display_name) {
        this.display_name = this.email.split('@')[0];
    }
    next();
});

/**
 * Ensures passwords are hashed before being saved to the database. Runs before
 * validation so that the regex enforcement of a bcrypt-like password field doesn't
 * fail.
 */
schema.pre('validate', function (next) {
    if (!this.isNew && this.isModified('password')) {
        this.password = hash_password(this.password);
    }
    next();
});

/**
 * A utility method for signing up new users as an alternative to `User.create`.
 */
schema.statics.signup = function (data, callback) {
    data.password = hash_password(data.password);
    var user = new model(data);
    user.save(callback);
};

var model = mongoose.model('User', schema);

module.exports.Model = model;
module.exports.Schema = schema;
