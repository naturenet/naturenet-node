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

//this function sends a notification to the user's phone when someone comments on their observation or idea
exports.pushNotificationComment = functions.database.ref('/comments/{cId}')
  .onWrite(event => {
    //get all the comment information here
    const commentInfo = event.data.current.val();
    var commenter = commentInfo.commenter;
    var context = commentInfo.context;
    var parent = commentInfo.parent;

    //declare some variables that will be needed
    var submitter;
    var userToken;
    var databaseRef;
    var message;

    //declare database reference based on the context
    if(context === 'observations'){
      databaseRef = admin.database().ref('/observations').child(parent).child('observer');
      message = ' commented on your Observation.'
    }else if (context == 'ideas') {
      databaseRef = admin.database().ref('/ideas').child(parent).child('submitter');
      message = ' commented on your Design Idea.'
    }

      //query for the user who submitted the observation
      databaseRef.once('value', function(snap){
        submitter = snap.val();

        //make sure the observation submitter and commenter aren't the same person
        if(submitter != commenter){

          console.log('Notification to be sent to: ' + submitter);

          //if they're not the same person, query for the submitter's notification token so we can send the notification
          admin.database().ref('/users').child(submitter).child('notification_token').once('value', function(snap){
            userToken = snap.val();

            //make sure the user has a token
            if(userToken != null){
              console.log('Sending notification to: ' + submitter);


              admin.database().ref('/users').child(commenter).child('display_name').once('value', function(snap){

                var user = snap.val();

                //create the notification payload
                let payload = {
                    data: {
                      title: 'New Comment',
                      context: context,
                      parent: parent,
                      body: user + message,
                      sound: 'default'
                    }
                  };
                //send the notification
                return admin.messaging().sendToDevice(userToken, payload).then(ok =>{
                  console.log('Notification sent to: ' + submitter);
                }).catch(error => {
                  console.log('Could not send notification.');
                });
              })

            }

          });

        }

      });
    });
