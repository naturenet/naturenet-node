var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Mixed = mongoose.Schema.Types.Mixed;

var schema = new mongoose.Schema({
    activity:       { type: ObjectId,   required: true,     ref: 'Activity' },
    observer:       { type: ObjectId,   required: true,     ref: 'User' },
    location:       { type: [Number],   required: true,     index: '2dsphere' },
    data:           { type: Mixed,      required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

exports.Schema = schema;
