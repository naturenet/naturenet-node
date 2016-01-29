var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;
var Comment = require('./comment').Schema;

var activityLinkSchema = new mongoose.Schema({
    acitvity_id: { type: ObjectId, ref: 'Activity', required: true },
    site_id:     { type: ObjectId, ref: 'Site',     required: true },
},{ _id: false });

var schema = new mongoose.Schema({
    activity:       { type: activityLinkSchema, required: true },
    observer:       { type: ObjectId,           required: true,     ref: 'User' },
    location:       { type: [Number],           required: true,     index: '2dsphere' },
    data:           { type: Mixed,              required: true },
    comments:       { type: [Comment],          required: true,     default: []}
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

exports.Model = mongoose.model('Observation', schema);
exports.Schema = schema;
exports.ActivityLinkSchema = activityLinkSchema;
