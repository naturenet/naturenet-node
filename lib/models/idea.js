"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const ideas = new fb.FirebaseCollection(new Firebase(process.env.FIREBASE_URL + '/ideas'));
ideas.recordClass = fb.Likeable(fb.Commentable(fb.FirebaseRecord));
module.exports = ideas;
