'use strict';
const request = require('request-promise');

const Sites = require('../models/site');
const Activities = require('../models/activity');
const Users = require('../models/user');
const Observations = require('../models/observation');
const Ideas = require('../models/idea');
const Groups = require('../models/user-group');

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

console.log("Initializing firebase with data");
authenticate()
    .then(ok => {
        let elsewhere = Sites.newRecord("elsewhere", {
            name: 'Elsewhere',
            description: "Anywhere you are",
            location: [0,0]
        });
        //elsewhere.write();

        let activity = Activities.newRecord({
            name: 'Runoff Rundown',
            description: "What happens to stormwater in your backyard? Take a photo and tell us about it!",
            icon_url: "http://res.cloudinary.com/university-of-colorado/image/upload/v1431461261/3_Backyard_nxipz5.png",
            status: 'Open'
        });//.write().then(activity => {
            return activity.addLocation([0,0], elsewhere);
        //});
    })
    .then(ok => {
        console.log("Init completed successfully")
        process.exit();
    })
    .catch(error => {
        console.log("Init failed:");
        console.log(error);
        process.exit();
    });
