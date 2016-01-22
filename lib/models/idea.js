var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;
var Comment = require('./comment').Schema;

var schema = new mongoose.Schema({
    submitter:      { type: ObjectId,   required: true,     ref: 'User' },
    group:          { type: String,     required: true,     index: true },
    content:        { type: String,     required: true },
    icon_url:       { type: String,     required: true,     default: 'http://res.cloudinary.com/university-of-colorado/image/upload/v1431461261/3_Ask_kco6wn.png' },
    comments:       { type: [Comment],  required: true,     default: []}
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

exports.Schema = schema;
