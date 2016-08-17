'use strict'
var firebase = require('firebase');
var GeoFire = require('geofire');

var app = firebase.initializeApp({
    serviceAccount: "NatureNet Production-7bfaf963189a.json",
    databaseURL: "https://naturenet.firebaseio.com"
});
var db = firebase.database();

var observations = db.ref('observations');
var geo = db.ref('geo');
var comments = db.ref('comments');
var ideas = db.ref('ideas');
var geoFire = new GeoFire(geo);

console.log("Modifying Firebase data");
observations.once('value', function(obsSnapshot){
    obsSnapshot.forEach(function(obs) {
        if( obs.hasChild('data') && obs.child('data').hasChild('image') ) {
            var image = obs.child('data').child('image');
            image.ref.set(image.val().replace('http:', 'https:'));
        } else {
            console.log(obs.key + ' has no image');
        }

        return false;
    });
}).then(ok => {
    comments.once('value', function (commentsSnapshot) {
        observations.once('value', function(obsSnapshot){
            commentsSnapshot.forEach(function(comment) {
                var commentId = comment.key;
                var obsId = comment.child('parent').val();
                // If a comment c has parent p, p.comments.c should be true
                if (obsSnapshot.hasChild(obsId) && !(comment.hasChild('status') && comment.child('status').val().toLower() === 'deleted')) {
                    if (!(obsSnapshot.child(obsId).hasChild('comments') && obsSnapshot.child(obsId).child('comments').hasChild(commentId) && obsSnapshot.child(obsId).child('comments').child(commentId).val() === true)) {
                        observations.child(obsId).child('comments').child(commentId).set(true);
                        console.log(obsId + 'repaired comment reference' + commentId);
                    }
                }
            })
        })
        ideas.once('value', function(ideaSnapshot){
            commentsSnapshot.forEach(function(comment) {
                var commentId = comment.key;
                var ideaId = comment.child('parent').val();
                // If a comment c has parent p, p.comments.c should be true
                if (ideaSnapshot.hasChild(ideaId) && !(comment.hasChild('status') && comment.child('status').val().toLower() === 'deleted')) {
                    if (!(ideaSnapshot.child(ideaId).hasChild('comments') && ideaSnapshot.child(ideaId).child('comments').hasChild(commentId) && ideaSnapshot.child(ideaId).child('comments').child(commentId).val() === true)) {
                        ideas.child(ideaId).child('comments').child(commentId).set(true);
                        console.log(ideaId + ' repaired comment reference' + commentId);
                    }
                }
            })
        })
    });
}).then(ok => {
    geo.once('value', function (geoSnapshot) {
        observations.once('value', function(obsSnapshot){
            obsSnapshot.forEach(function(obs) {

                if( obs.hasChild('activity_location') && geoSnapshot.child('activities').hasChild(obs.child('activity_location').val()) ) {
                    var geoActivity = geoSnapshot.child('activities').child(obs.child('activity_location').val());

                    if (!obs.hasChild('site')) {
                        var siteId = geoActivity.child('site').val();
                        obs.ref.child('site').set(siteId);
                        console.log(obs.key + 'site set to ' + siteId);
                    }

                    if (!obs.hasChild('activity')) {
                        var activityId = geoActivity.child('activity').val();
                        obs.ref.child('activity').set(activityId);
                        console.log(obs.key + 'activity set to ' + activityId);
                    }
                } else {
                    console.log(obs.key + ' invalid activity location! ' + obs.child('activity_location').val());
                }

                if (obs.hasChild('l') && obs.child('l').val().constructor === Array) {
                    if (!geoSnapshot.hasChild(obs.key)) {
                        var l = obs.child('l').val();
                        geoFire.set(obs.ref.key, l).then(ok => console.log('generated g for ' + obs.key));
                    }
                } else {
                    console.log(obs.key + ' invalid or missing location! ' + obs.child('l').val());
                }

                return false;
            });
        });
    })
}).then(ok => {
    console.log("Completed");
})
.catch(error => {
    console.log("Failed:");
    console.log(error);
    process.exit();
});
