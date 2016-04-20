'use strict';
const request = require('request-promise');

const Observations = require('../models/observation');

/**
 * Authenticate using the apps secret key.
 */
function authenticate() {
    return new Promise((resolve, reject) => {
        new Firebase(process.env.FIREBASE_URL).authWithCustomToken(process.env.FIREBASE_SECRET, (error, auth) => {
            if (error) {
                reject(error)
            } else {
                resolve();
            }
        });
    });
}

function doProjects() {
    Observations.root.orderByChild('updated_at').once('value', function(dataSnapshot) {
        var projects = {};
        dataSnapshot.forEach(function(childSnapshot) {
            projects[childSnapshot.child('activity_location').val() ] = childSnapshot.child('updated_at').val();
        });
        var projectsRef = new Firebase(process.env.FIREBASE_URL + '/geo/activities');
        for(var p in projects) {
            projectsRef.child(p).child('latest_contribution').set(projects[p]);
        }
    });
}

function doUsers() {
    Observations.root.orderByChild('updated_at').once('value', function(dataSnapshot) {
        var users = {};
        dataSnapshot.forEach(function(childSnapshot) {
            users[childSnapshot.child('observer').val() ] = childSnapshot.child('updated_at').val();
        });
        var projectsRef = new Firebase(process.env.FIREBASE_URL + '/users');
        for(var u in users) {
            projectsRef.child(u).child('latest_contribution').set(users[u]);
        }
    });
}

console.log("Applying observation timestamps");
authenticate()
    .then(ok => {
        doUsers();
    })
    .then(ok => {
        console.log("Timestamping completed successfully")
    })
    .catch(error => {
        console.log("Timestamping failed:");
        console.log(error);
        process.exit();
    });
