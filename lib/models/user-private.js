"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const users_private = new fb.FirebaseCollection(new Firebase(process.env.FIREBASE_URL + '/users-private'));
module.exports = users_private;
