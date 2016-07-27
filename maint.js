'use strict'
var firebase = require('firebase');
var GeoFire = require('geofire');

var app = firebase.initializeApp({
    serviceAccount: "NatureNet Production-7bfaf963189a.json",
    databaseURL: "https://naturenet.firebaseio.com"
});
var db = firebase.database();

var observations = db.ref('observations');
var geo = db.ref('geo/activities');

console.log("Modifying Firebase data");

geo.once('value', function (geoSnapshot) {
    observations.once('value', function(obsSnapshot){
        obsSnapshot.forEach(function(obs) {

            console.log('repairing ' + obs.key);

            if( obs.hasChild('activity_location') && geoSnapshot.hasChild(obs.child('activity_location').val()) ) {
                var geoActivity = geoSnapshot.child(obs.child('activity_location').val());

                if (!obs.hasChild('site')) {
                    var siteId = geoActivity.child('site').val();
                    obs.ref.child('site').set(siteId);
                    console.log('site is ' + siteId);
                }

                if (!obs.hasChild('activity')) {
                    var activityId = geoActivity.child('activity').val();
                    obs.ref.child('activity').set(activityId);
                    console.log('activity is ' + activityId);
                }
            } else {
                console.log(obs.key + ' invalid activity location! ' + obs.child('activity_location').val());
            }

            if (obs.hasChild('l') && obs.child('l').val().constructor === Array) {
                if (!obs.hasChild('g')) {
                    var geoFire = new GeoFire(db.ref('geo'));
                    var l = obs.child('l').val();
                    geoFire.set(obs.ref.key, l).then(ok => console.log('generated g for location ' + l));
                }
            } else {
                console.log(obs.key + ' invalid or missing location! ' + obs.child('l').val());
            }

            return false;
        });
    });
})
.then(ok => {
    console.log("Completed");
})
.catch(error => {
    console.log("Failed:");
    console.log(error);
    process.exit();
});
