"use strict";
const Firebase = require('firebase');
const fb = require('./firebase-classes');

const ideas = new fb.FirebaseCollection(new Firebase('https://naturenet-testing.firebaseio.com/ideas'));
ideas.recordClass = fb.Commentable(fb.FirebaseRecord);
module.exports = ideas;
