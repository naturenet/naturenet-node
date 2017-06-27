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

exports.validateIdea = functions.database.ref('/ideas/{ideaId}').onWrite(event => {
    const idea = event.data.val();
    const id = event.params.ideaId;

    if(!!idea && !!idea.status && idea.status.toLowerCase() === 'deleted') { // handle deleted status
        console.log('Idea deleted: ', id);

        return admin.database().ref('/ideas-deleted').child(id).set(idea)
            .then(function() {
                return event.data.adminRef.remove()
                    .catch(function(error) {
                        console.log("Failed to delete original record: " + error.message)
                    });
            })
            .catch(function(error) {
                console.log("Failed to copy record to quarantine: " + error.message)
            });
    }
});

exports.validateComment = functions.database.ref('/comments/{cId}').onWrite(event => {
    const comment = event.data.val();
    const id = event.params.cId;

    if(!!comment && !!comment.status && comment.status.toLowerCase() === 'deleted') { // handle deleted status
        console.log('Comment deleted: ', id);

        return admin.database().ref('/comments-deleted').child(id).set(comment)
            .then(function() {
                return event.data.adminRef.remove()
                    .catch(function(error) {
                        console.log("Failed to delete original record: " + error.message)
                    });
            })
            .catch(function(error) {
                console.log("Failed to copy record to quarantine: " + error.message)
            });
    }
});

//this function updates the user status to active whenever an observation is made
exports.updateUserStatus = functions.database.ref('observations/{oId}').onWrite(event => {
  const observation = event.data.val();

  if(!!observation && !!observation.observer){
    return admin.database().ref('users').child(observation.observer).child('status').set('active')
      .then(ok => {
        console.log(observation.observer + " set as active");
      })
      .catch(error => {
        console.log("Something went wrong setting " + uid + " as active.");
      });
  }
});

//http function that runs when triggered by a url
//the purpose is to set the user's 'status' to inactive if no contributions have been made in the past x months
exports.accountCleanup = functions.https.onRequest((req, res) => {
  var resultsLog = 'Users set as inactive: ';

  admin.database().ref('users').once('value', function(usersSnapshot){
    usersSnapshot.forEach(function(user) {
      var status = 'inactive';

      //if user has field latest_contribution and their last contribution was more than six months ago
      if(user.hasChild('latest_contribution') && ((Date.now() - user.child('latest_contribution').val()) > (2629743000*6))){
        //set the user's status as inactive
        admin.database().ref('users/' + user.ref.key).child('status').set(status);
        console.log(user.ref.key + ' set as inactive');
        resultsLog += (user.ref.key + ', ');
      //or, if the user hasn't contributed anything, check to see if they've had an account for more than six months
      }else if (!user.hasChild('latest_contribution') && (Date.now() - user.child('created_at').val()) > 2629743000*6) {
        admin.database().ref('users/' + user.ref.key).child('status').set(status);
        console.log(user.ref.key + ' set as inactive');
        resultsLog += (user.ref.key + ', ');
      }else{
        console.log(user.ref.key + " is active.");
      }

    });
  }).then(ok => {
    res.send(resultsLog);
  }).catch(error => {
    console.log('Failed');
    res.send('Something went wrong.');
  });
});

//this function sets the status of every user to active
exports.setAllUsersActive = functions.https.onRequest((req, res) => {
  var resultsLog = 'Users set as active: ';

  admin.database().ref('users').once('value', function(usersSnapshot){
    usersSnapshot.forEach(function(user) {
      var status = 'active';

      //set all the user's status as active
      admin.database().ref('users/' + user.ref.key).child('status').set(status);
      console.log(user.ref.key + ' set as active');
      resultsLog += (user.ref.key + ', ');

    });
  }).then(ok => {
    res.send(resultsLog);
  }).catch(error => {
    console.log('Failed');
    res.send('Something went wrong.');
  });
});
