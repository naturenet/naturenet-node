var mongoose = require('mongoose');
var unique = require('mongoose-unique-validator');

var schema = new mongoose.Schema({
    name:           { type: String,     required: true,     unique: true },
    description:    { type: String,     required: true },
    location:       { type: [Number],   required: true,     index: '2dsphere' },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

schema.plugin(unique);

exports.Schema = schema;
