'use strict'
const Firebase = require('firebase');
const fs = require('fs');
const request = require('request-promise');
const Sites = require('../lib/models/site');
const Activities = require('../lib/models/activity');
const Users = require('../lib/models/user');
const Observations = require('../lib/models/observation');
const Ideas = require('../lib/models/idea');
const Groups = require('../lib/models/user-group');

const host = new Firebase(process.env.FIREBASE_URL);
let local_path = __dirname + '/data/';
let root_data = {};

/**
 * Repeats a promise-returning operation a set number of times. Firebase will put a temporary
 * block on a client that makes too many requests in a short time period. This function essentially
 * serializes each write we make as part of the seeding.
 */
function repeat(times, operation) {
    return operation()
        .then(ok => {
            if ((times - 1) > 0) {
                return repeat(times - 1, operation);
            }
            return ok;
        });
}

/**
 * Deletes all users in the application that are marked `testuser: true`.
 */
function dropTestUsers() {
    return new Promise((resolve, reject) => {
        Users.root.orderByChild('public/testuser').equalTo(true).once("value", snapshot => {
            let list = snapshot.val();
            if (!list) {
                resolve();
            } else {
                let ids = Object.keys(list);
                let deleteUser = function() {
                    let id = ids.shift();
                    return Users.root.removeUser({email: list[id].private.email, password: 'testuser'})
                        .then(ok => {
                            return Users.root.child(id).remove();
                        });
                };
                resolve(repeat(ids.length, deleteUser));
            }
        }, error => {
            reject(err);
        });
    });
}

/**
 * Deletes all records and test users.
 */
function cleanDb() {
    return Sites.drop()
    .then(ok => { return Activities.drop() })
    .then(ok => { return dropTestUsers() })
    .then(ok => { return Observations.drop() })
    .then(ok => { return Ideas.drop() })
    .then(ok => { return Groups.drop() });
}

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

function readFile(filepath) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

function uploadDirectory(dir) {
    console.log("Reading " + dir);
    let path = local_path + dir + '/';
    let child = host.child(dir);
    var data = {};
    fs.readdirSync(path).forEach(f => {
        console.log("read file " + f);
        data[f.split('.')[0]] = readFile(path + f);
    });
    console.log("Uploading")
    child.update(data);
    root_data[dir.split('/').join('.')] = data;
}

/**
* Firebaseis blocking these serial writes and I wasn't able to work around it. For lack of anything better,
* run the script with the step you want to perform uncommented.
**/
console.log("Uploading firebase data");
authenticate()
    //.then(ok => cleanDb())
    //.then(ok => uploadDirectory("activities"))
    //.then(ok => uploadDirectory("geo/activities"))
    //.then(ok => uploadDirectory("ideas"))
    //.then(ok => uploadDirectory("observations"))
    //.then(ok => uploadDirectory("sites"))
    //.then(ok => uploadDirectory("users"))
    .then(ok => {
        console.log("Upload completed successfully")
        fs.writeFile(local_path + "output.json", JSON.stringify(root_data), (err) => {
            if (err) throw err;
            console.log("Output written to file");
            process.exit();
        });
    })
    .catch(error => {
        console.log("Upload failed:");
        console.log(error);
        process.exit();
    });
