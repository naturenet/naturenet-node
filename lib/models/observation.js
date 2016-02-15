"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const observations = new fb.FirebaseCollection(new Firebase('https://naturenet-testing.firebaseio.com/observations'));
observations.recordClass = fb.LocationAwareRecord;
module.exports = observations;
