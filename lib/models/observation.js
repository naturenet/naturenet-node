"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const observations = new fb.FirebaseCollection(new Firebase(process.env.FIREBASE_URL + '/observations'));
observations.recordClass = fb.Commentable(fb.LocationAwareRecord);
module.exports = observations;
