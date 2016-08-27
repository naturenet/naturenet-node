'use strict'
var firebase = require('firebase');
var GeoFire = require('geofire');

var app = firebase.initializeApp({
    serviceAccount: "NatureNet Production-ec0b64eca74d.json",
    databaseURL: "https://naturenet.firebaseio.com"
});
var db = firebase.database();

var observations = db.ref('observations');
var geo = db.ref('geo');
var comments = db.ref('comments');
var ideas = db.ref('ideas');
var geoFire = new GeoFire(geo);

console.log("Modifying Firebase data");
// Convert hosted image URLs to HTTPS
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
// Associate comments and their parents with each other
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
            });
        });
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
            });
        });
    });
}).then(ok => {
// Generate Geohash for all observations
  observations.once('value', function(obsSnapshot){
    obsSnapshot.forEach(function(obs) {
      if (obs.hasChild('l') && obs.child('l').val().constructor === Array) {
        var l = obs.child('l').val();
        geoFire.set(obs.ref.key, l).then(ok => console.log('generated g for ' + obs.key));
      } else {
        console.log(obs.key + ' invalid or missing location! ' + obs.child('l').val());
      }

      return false;
    });
  });
}).then(ok => {
// Extract activity and site IDs for observations using old geo-activity references
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

        return false;
      });
    })
  })
}).then(ok => {
// Move submissions marked deleted to quarantine
    observations.once('value', function(obsSnapshot){
        var obsDeleted = db.ref('observations-deleted');
        obsSnapshot.forEach(function(obs) {
            var id = obs.key;
            if( obs.hasChild('status') && obs.child('status').val().toLowerCase() === 'deleted' ) {
                obsDeleted.child(id).set(obs.val(), function(err) {
                    if(err) {
                        console.log('could not move observation ' + id);
                    } else {
                        obs.ref.remove().then(ok => {
                            console.log('observation ' + id + ' quarantined');
                        });
                    }
                });
            }
            return false;
        });
    });
    ideas.once('value', function(ideaSnapshot){
        var ideasDeleted = db.ref('ideas-deleted');
        ideaSnapshot.forEach(function(idea) {
            var id = idea.key;
            if( idea.hasChild('status') && idea.child('status').val().toLowerCase() === 'deleted' ) {
                ideasDeleted.child(id).set(idea.val(), function(err) {
                    if(err) {
                        console.log('could not move idea ' + id);
                    } else {
                        idea.ref.remove().then(ok => {
                            console.log('idea ' + id + ' quarantined');
                        });
                    }
                });
            }
            return false;
        });
    });
    comments.once('value', function(cmtSnapshot){
        var cmtDeleted = db.ref('comments-deleted');
        cmtSnapshot.forEach(function(cmt) {
            var id = cmt.key;
            if( cmt.hasChild('status') && cmt.child('status').val().toLowerCase() === 'deleted' ) {
                cmtDeleted.child(id).set(cmt.val(), function(err) {
                    if(err) {
                        console.log('could not move comment ' + id);
                    } else {
                        cmt.ref.remove().then(ok => {
                            console.log('comment ' + id + ' quarantined');
                        });
                    }
                });
            }
            return false;
        });
    });
}).then(ok => {
    console.log("Completed");
})
.catch(error => {
    console.log("Failed:");
    console.log(error);
    process.exit();
});
