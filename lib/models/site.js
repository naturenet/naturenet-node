"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const sites = new fb.FirebaseCollection(new Firebase('https://naturenet-testing.firebaseio.com/sites'));
sites.recordClass = fb.LocationAwareRecord;
module.exports = sites;
