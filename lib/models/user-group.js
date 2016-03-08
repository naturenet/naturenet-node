"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const user_groups = new fb.FirebaseCollection(new Firebase(process.env.FIREBASE_URL + '/groups'));
user_groups.recordClass = fb.Joinable(fb.FirebaseRecord)
module.exports = user_groups;