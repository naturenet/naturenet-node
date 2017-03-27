'use strict'

const functions = require('firebase-functions');
const admin = require('firebase-admin');
var GeoFire = require('geofire');
admin.initializeApp(functions.config().firebase);

const elsewhere = 'zz_elsewhere';

exports.validateObservation = functions.database.ref('/observations/{obsId}').onWrite(event => {
    const observation = event.data.val();
    const id = event.params.obsId;

    // TODO: chain these cases with promises so they execute linearly in one pass
    // handling each case exclusively allows the event to trigger again to handle later cases

    if(!!observation && !!observation.status && observation.status.toLowerCase() === 'deleted') { // handle deleted status
        console.log('Observation deleted: ', id);

        return admin.database().ref('/observations-deleted').child(id).set(observation)
            .then(function() {
                return event.data.adminRef.remove()
                    .then(function() {
                        admin.database().ref('/geo').child(id).remove();
                    })
                    .catch(function(error) {
                        console.log("Failed to delete original record: " + error.message)
                    });
            })
            .catch(function(error) {
                console.log("Failed to copy record to quarantine: " + error.message)
            });
    } else if (!!observation && !observation.site){ // handle missing site
        console.log('Observation is missing valid site field: ', id);

        const user = observation.observer;
        return admin.database().ref('/users').child(user).child('affiliation').once('value', function(data) {
            if(!!data.val()) {
                return event.data.adminRef.child('site').set(data.val());
            } else {
                console.log('User has no affiliation: ', user);
                return event.data.adminRef.child('site').set(elsewhere);
            }
        });
    } else if (!!observation && !observation.l) { // handle missing location
        console.log('Observation is missing geolocation: ', id);

        return admin.database().ref('/sites').child(observation.site).child('l').once('value', function(data) {
            return event.data.adminRef.child('l').set(data.val());
        });
    } else if (!!observation && !!observation.l) { // update geofire reference
        var geo = admin.database().ref('/geo');
        return new GeoFire(geo).set(id, observation.l);
    }
});