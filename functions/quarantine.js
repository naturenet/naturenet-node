'use strict'

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

exports.quarantineObservation = functions.database.ref('/observations/{obsId}').onWrite(event => {
    const observation = event.data.val();

    if(observation && observation.status == 'deleted') {
        console.log('Observation deleted: ', obsId);

        admin.database().ref('/observations-deleted/${obsId}').set(observation)
            .then(function() {
                event.data.adminRef.remove()
                    .catch(function(error) {
                        console.log("Failed to delete original record: " + error.message)
                    });
            })
            .catch(function(error) {
                console.log("Failed to copy record to quarantine: " + error.message)
            });
    }
});