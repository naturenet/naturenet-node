

// open the database connection
var mongoose = require('mongoose');
mongoose.connect(process.env.DATABASE_URL);

// load the schema's
var activity = require('./models/activity.js');
var comment = require('./models/comment.js');
var idea = require('./models/idea.js');
var observation = require('./models/observation.js');
var site = require('./models/site.js');
var user = require('./models/user.js');

// generate and export the models
module.exports.Activity     = mongoose.model('Activity', activity.Schema);
module.exports.Comment      = mongoose.model('Comment', comment.Schema);
module.exports.Idea         = mongoose.model('Idea', idea.Schema);
module.exports.Observation  = mongoose.model('Observation', observation.Schema);
module.exports.Site         = mongoose.model('Site', site.Schema);
module.exports.User         = mongoose.model('User', user.Schema);
module.exports.Connection   = mongoose.connection;
