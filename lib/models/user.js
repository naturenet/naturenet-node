var mongoose = require('mongoose');
var unique = require('mongoose-unique-validator');
var validate = require('mongoose-validate');
var hidden = require('mongoose-hidden');
var bcrypt = require('bcrypt');

var schema = new mongoose.Schema({
    display_name:   { type: String,     required: false },
    account_type:   { type: String,     required: true,     enum: ['NatureNet'] },
    username:       { type: String,     required: true,     unique: true },
    password:       { type: String,     required: true,     hide: true,         match: [ /\$2[aby]\$10\$[a-zA-z0-9\+\.\/=]{53}/, "Password does not appear to be a bcrypt hash"] },
    email:          { type: String,     required: true,     validate: [validate.email, 'invalid email address'] },
    avatar_url:     { type: String,     required: false },
    consent_text:   { type: String,     required: false,    hide: true },
    affiliation:    { type: String,     required: false }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.plugin(unique);
schema.plugin(hidden, { defaultHidden: {} });

/**
 * Hashes a plaintext password and store the hashed value in the model.
 * The `password` property should not be set directly.
 *
 * @param {string} plaintext - The password submitted by the user.
 */
schema.methods.store_password = function (plaintext) {
    if (!plaintext || !(plaintext instanceof String)) {
        return; // let the model fail validation
    }
    this.password = bcrypt.hashSync(plaintext, 10);
};

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

module.exports.Schema = schema;
