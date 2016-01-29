var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var siteLinkSchema = new mongoose.Schema({
    site_id:        { type: ObjectId, ref: 'Site', required: true },
    location:       { type: [Number],              required: false},
}, { _id: false });

var schema = new mongoose.Schema({
    name:           { type: String,             required: true },
    sites:          { type: [siteLinkSchema],   required: true,     default: [] },
    description:    { type: String,             required: true },
    location:       { type: [Number],           required: true,     index: '2dsphere' },
    icon_url:       { type: String,             required: true,     default: 'http://res.cloudinary.com/university-of-colorado/image/upload/v1427400563/2_FreeObservations_mjzgnh.png' },
    markup:         { type: String,             required: true }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

exports.Model = mongoose.model('Activity', schema);
exports.Schema = schema;
exports.SiteLinkSchema = siteLinkSchema;
