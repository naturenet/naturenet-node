"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const user_groups = new fb.FirebaseCollection(new Firebase(process.env.FIREBASE_URL + '/groups'));
module.exports = user_groups;