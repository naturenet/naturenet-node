var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;
var Comment = require('./comment').Schema;

var activityLinkSchema = new mongoose.Schema({
    activity_id: { type: ObjectId, ref: 'Activity', required: true },
    site_id:     { type: ObjectId, ref: 'Site',     required: true },
},{ _id: false });

var schema = new mongoose.Schema({
    activity:       { type: activityLinkSchema, required: true },
    observer:       { type: ObjectId,           required: true,     ref: 'User' },
    location:       { type: [Number],           required: true,     index: '2dsphere' },
    data:           { type: Mixed,              required: true },
    comments:       { type: [Comment],          required: false }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/**
 * Add a comment to this observation.
 *
 * @param user {object} - the user making the comment, can be a User instance or a valid user id.
 * @param message {string} - the comment message.
 */
schema.methods.addComment = function (user, message) {
    this.comments.push({commenter: user, comment: message});
};

exports.Model = mongoose.model('Observation', schema);
exports.Schema = schema;
exports.ActivityLinkSchema = activityLinkSchema;
