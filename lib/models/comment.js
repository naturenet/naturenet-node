var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var schema = new mongoose.Schema({
    commenter:      { type: ObjectId,   required: true,     ref: 'User' },
    idea:           { type: ObjectId,   required: true,     ref: 'Idea' },
    comment:        { type: String,     required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

exports.Schema = schema;
