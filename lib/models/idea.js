var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Comment = require('./comment').Schema;

var schema = new mongoose.Schema({
    submitter:      { type: ObjectId,   required: true,     ref: 'User' },
    group:          { type: String,     required: true,     index: true },
    content:        { type: String,     required: true },
    icon_url:       { type: String,     required: true,     default: 'http://res.cloudinary.com/university-of-colorado/image/upload/v1431461261/3_Ask_kco6wn.png' },
    comments:       { type: [Comment],  required: false }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/**
 * Add a comment to this idea.
 *
 * @param user {object} - the user making the comment, can be a User instance or a valid user id.
 * @param message {string} - the comment message.
 */
schema.methods.addComment = function (user, message) {
    this.comments.push({commenter: user, comment: message});
};

/**
 * Finds all ideas submitted by a user.
 *
 * @param user {object} - the user to find ideas for, can be a User instance or a valid user id.
 * @returns {Promise} - the executing query.
 */
schema.statics.submittedBy = function function_name (user) {
    return model.find({ submitter: user }).exec();
}

var model = mongoose.model('Idea', schema);

exports.Model = model;
exports.Schema = schema;
