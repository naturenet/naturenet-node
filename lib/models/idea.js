"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

module.exports = new fb.FirebaseCollection(new Firebase('https://naturenet-testing.firebaseio.com/ideas'));
