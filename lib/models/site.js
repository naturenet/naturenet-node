"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const sites = new fb.FirebaseCollection(new Firebase(process.env.FIREBASE_URL + '/sites'));
sites.recordClass = fb.LocationAwareRecord;
module.exports = sites;
