'use strict'

const functions = require('firebase-functions');
const admin = require('firebase-admin');

const nodemailer = require('nodemailer');
const nnemail = encodeURIComponent(functions.config().nn.email);
const nnp = encodeURIComponent(functions.config().nn.p);
const mailTransport = nodemailer.createTransport(`smtps://${nnemail}:${nnp}@smtp.gmail.com`);

const devEmails = ["mj_mahzoon@yahoo.com", "smacneil01@gmail.com", "rtrejo@uncc.edu"];

var mailOptions = {
    from: '"NatureNet" <noreply@nature-net.org>'
};

var GeoFire = require('geofire');
admin.initializeApp(functions.config().firebase);

const elsewhere = 'zz_elsewhere';

exports.validateObservation = functions.database.ref('/observations/{obsId}').onWrite(event => {
    const observation = event.data.val();
    const id = event.params.obsId;

    // When the observation is first created
    if (!event.data.previous.exists()) {
        var post = { time: observation.created_at, context: "observations" };
        admin.database().ref('/users-private').child(observation.observer).child("my_posts").child(id).set(post)
            .catch(function(error) { console.log("Failed to add post (observation): " + error.message); } );
    }

    // TODO: chain these cases with promises so they execute linearly in one pass
    // handling each case exclusively allows the event to trigger again to handle later cases

    if(!!observation && !!observation.status && observation.status.toLowerCase() === 'deleted') { // handle deleted status
        console.log('Observation deleted: ', id);

        admin.database().ref('/users-private').child(observation.observer).child("my_posts").child(id).remove()
            .catch(function(error) { console.log("Failed to delete post (observation): " + error.message); });

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
    //check to see if the idea was deleted. if so, simply return null so we don't do anything else
    if(idea == null){
      return null;
    }
    const id = event.params.ideaId;
    var submitter = idea.submitter;

    // When the idea is first created
    if (!event.data.previous.exists()) {
        var post = { time: idea.created_at, context: "ideas" };
        admin.database().ref('/users-private').child(idea.submitter).child("my_posts").child(id).set(post)
            .catch(function(error) { console.log("Failed to add post (idea): " + error.message); } );
        // send an email to the dev team about a new design idea
        var subject = "[NatureNet] We have a new design idea.";
        var body =  "Hi, \n\nA new design idea was just created.\n\nThe design idea info:\nId: " +
                    id + "\nText: " + idea.content +
                    "\n\nRegards,\nNatureNet Team";
        devEmails.forEach(function (email) {
            sendEmail(email, subject , body);
        });
    }

    if(!!idea && !!idea.status && event.data.child('status').changed()) { // handle a change in status
        if(idea.status.toLowerCase() === 'deleted'){  //handle deleted status
        console.log('Idea deleted: ', id);

        admin.database().ref('/users-private').child(idea.submitter).child("my_posts").child(id).remove()
            .catch(function(error) { console.log("Failed to delete post (idea): " + error.message); });

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
          }else{  //otherwise, we know the status was changed to something else
            console.log('Status has changed on an idea: ' + idea.id);
            //get the user's email
            admin.auth().getUser(submitter).then(function(user){
              var to = user.email;
              var subject = "Your design idea status has changed.";
              var html = '<html><body><p>Recently, your design idea status was updated to: <b>' + ideaStatus(idea.status) +
                        '</b>.<br><br>"' + idea.content + '"<br><br>Please visit <a href = https://www.nature-net.org/ideas>www.nature-net.org</a>' +
                        ' to see the idea on the website. <br>NatureNet Team</p></body></html>';


              sendEmailHtml(to, subject, html);
            });
          }
    }
});

function ideaStatus(status){
  var status;
  switch (status) {
    case 'doing': status = "Discussing";
      break;
    case 'developing': status = "Developing";
      break;
    case 'testing': status = 'Testing';
      break;
    case 'done': status =  "Done";
      break;
    default: status = "Discussing";
      break;
  }

  return status;
}

exports.validateComment = functions.database.ref('/comments/{commentId}').onWrite(event => {
    const comment = event.data.val();
    const comment_id = event.params.commentId;
    var parent_ref;

    if (event.data.current.exists()) {  // the comment was created or edited

        if (comment.context == "observations")
            parent_ref = admin.database().ref('/observations').child(comment.parent).child("observer");
        if (comment.context == "ideas")
            parent_ref = admin.database().ref('/ideas').child(comment.parent).child("submitter");
        var post_id = comment.parent + "_" + comment.commenter;

        if (parent_ref) {
            parent_ref.once("value", function(snapshot) {
                var parent_user_id = snapshot.val();

                if (!event.data.previous.exists()) { // the comment was first created
                    var timestamp = admin.database.ServerValue.TIMESTAMP;
                    var post = {
                        created_at: timestamp,
                        updated_at: timestamp,
                        context: comment.context,
                        post: comment.parent,
                        user: comment.commenter,
                        text: comment.comment,
                        seen: false
                    };
                    admin.database().ref('/users-private').child(parent_user_id).child("comments").child(post_id).set(post)
                    .catch(function(error) { console.log("Failed to add the comment: " + error.message); } );

                    admin.database().ref('/users').child(parent_user_id).child("display_name").once("value", function(snapshot1) {
                        var the_parent_user_displayName = snapshot1.val();
                        admin.database().ref('/users').child(comment.commenter).child("display_name").once("value", function(snapshot2) {
                            var the_commenter_displayName = snapshot2.val();
                            console.log("sending notification to "+ the_parent_user_displayName + " for " +
                                the_commenter_displayName + "'s comment.");
                            // send notification about the new comment
                            admin.auth().getUser(parent_user_id).then(function(the_parent_user) {
                                  mailOptions.to = the_parent_user.email;
                                  mailOptions.subject = "[NatureNet] You have a new comment.";
                                  mailOptions.text = "Hey " + the_parent_user_displayName + ", \n\n You have a new comment from " +
                                                     the_commenter_displayName + ":\n\"" + comment.comment +
                                                     "\"\n\nPlease visit www.nature-net.org to see the comment in the website.\n\n" +
                                                     "NatureNet Team";
                                  mailTransport.sendMail(mailOptions).then(() => {
                                    console.log('A notification email sent to: ', the_parent_user.email);
                                  });
                            });
                        });
                    });
                }
                else { // the comment was edited
                    var post = {
                        updated_at: admin.database.ServerValue.TIMESTAMP,
                        text: comment.comment,
                        seen: false
                    };
                    admin.database().ref('/users-private').child(parent_user_id).child("comments").child(post_id).update(post)
                    .catch(function(error) { console.log("Failed to update the comment: " + error.message); } );
                }
            });
        }
    }
    else { // the comment was deleted

        const deleted_comment = event.data.previous.val();

        if (deleted_comment.context == "observations")
            parent_ref = admin.database().ref('/observations').child(deleted_comment.parent).child("observer");
        if (deleted_comment.context == "ideas")
            parent_ref = admin.database().ref('/ideas').child(deleted_comment.parent).child("submitter");
        var post_id = deleted_comment.parent + "_" + deleted_comment.commenter;

        if (parent_ref) {
            parent_ref.once("value", function(snapshot) {
                var parent_user_id = snapshot.val();

                if (parent_user_id) {
                    admin.database().ref('/users-private').child(parent_user_id).child("comments").child(post_id).remove()
                    .catch(function(error) { console.log("Failed to delete the comment: " + error.message); });
                }

                return admin.database().ref('/comments-deleted').child(comment_id).set(deleted_comment)
                    .then(function() {
                        return event.data.adminRef.remove()
                            .catch(function(error) {
                                console.log("Failed to delete original record: " + error.message)
                            });
                    })
                    .catch(function(error) {
                        console.log("Failed to copy record to quarantine: " + error.message)
                    });
            });
        }
    }
});

exports.validateObservationLike = functions.database.ref('/observations/{observationId}/likes/{userId}').onWrite(event => {
    const like_value = event.data.val();
    const observation_id = event.params.observationId;
    const user_id = event.params.userId;
    const observer_ref = admin.database().ref('/observations').child(observation_id).child("observer");
    var observer_id;
    var post_id = observation_id + "_" + user_id;

    observer_ref.once("value", function(snapshot) {
        observer_id = snapshot.val();

        if (!event.data.previous.exists()) { // the like value was first created
            var timestamp = admin.database.ServerValue.TIMESTAMP;
            var post = {
                created_at: timestamp,
                updated_at: timestamp,
                context: "observations",
                value: like_value,
                post: observation_id,
                user: user_id,
                seen: false
            };

            admin.database().ref('/users-private').child(observer_id).child("likes").child(post_id).set(post)
            .catch(function(error) { console.log("Failed to add post (observation-like): " + error.message); } );
        }
        else
        {
            if(!event.data.current.exists()) { // the like value was deleted
                if (observer_id) {
                    admin.database().ref('/users-private').child(observer_id).child("likes").child(post_id).remove()
                    .catch(function(error) { console.log("Failed to delete post (observation-like): " + error.message); });
                }
            }
            else { // the like value was edited
                var post = {
                    updated_at: admin.database.ServerValue.TIMESTAMP,
                    value: like_value,
                    seen: false
                };
                admin.database().ref('/users-private').child(observer_id).child("likes").child(post_id).update(post)
                .catch(function(error) { console.log("Failed to update post (observation-like): " + error.message); } );
            }
        }
    });
});

exports.validateIdeaLike = functions.database.ref('/ideas/{ideaId}/likes/{userId}').onWrite(event => {
    const like_value = event.data.val();
    const idea_id = event.params.ideaId;
    const user_id = event.params.userId;
    const submitter_ref = admin.database().ref('/ideas').child(idea_id).child("submitter");
    var submitter_id;
    var post_id = idea_id + "_" + user_id;

    submitter_ref.once("value", function(snapshot) {
        submitter_id = snapshot.val();

        if (!event.data.previous.exists()) { // the like value was first created
            var timestamp = admin.database.ServerValue.TIMESTAMP;
            var post = {
                created_at: timestamp,
                updated_at: timestamp,
                context: "ideas",
                value: like_value,
                post: idea_id,
                user: user_id,
                seen: false
            };

            admin.database().ref('/users-private').child(submitter_id).child("likes").child(post_id).set(post)
            .catch(function(error) { console.log("Failed to add post (idea-like): " + error.message); } );
        }
        else
        {
            if(!event.data.current.exists()) { // the like value was deleted
                if (submitter_id) {
                    admin.database().ref('/users-private').child(submitter_id).child("likes").child(post_id).remove()
                    .catch(function(error) { console.log("Failed to delete post (idea-like): " + error.message); });
                }
            }
            else { // the like value was edited
                var post = {
                    updated_at: admin.database.ServerValue.TIMESTAMP,
                    value: like_value,
                    seen: false
                };
                admin.database().ref('/users-private').child(submitter_id).child("likes").child(post_id).update(post)
                .catch(function(error) { console.log("Failed to update post (idea-like): " + error.message); } );
            }
        }
    });
});

function sendEmail(email, subject, body) {
    mailOptions.to =  email;
    mailOptions.subject =  subject;
    mailOptions.text =  body;

    mailTransport.sendMail(mailOptions).then(() => {
        console.log('A notification email sent to: ', email);
    });
}

//This function sends email with html content only.
function sendEmailHtml(email, subject, html){
  mailOptions.to = email;
  mailOptions.subject = subject;
  mailOptions.html = html;

  mailTransport.sendMail(mailOptions).then(() => {
    console.log('Email sent to: ' , email);
  })
}

exports.activityNotification = functions.database.ref('/activities/{activityId}').onWrite(event => {
    const activity = event.data.val();
    const id = event.params.activityId;
    if (!event.data.previous.exists()) { // the project was first created
        var subject = "[NatureNet] We have a new project.";
        var body =  "Hi, \n\nA new project was just created.\n\nThe project info:\nId: " +
                    id + "\nName: " + activity.name + "\nDescription: " + activity.description +
                    "\n\nRegards,\nNatureNet Team";
        devEmails.forEach(function (email) {
            sendEmail(email, subject , body);
        });
    }
});

//send Welcome email when a new user creates an account with NatureNet
exports.sendWelcomeEmail = functions.auth.user().onCreate(event => {
  const user = event.data;  //The Firebase user
  const email = user.email; //The Firebase user's email
  const uid = user.uid; //The Firebase user's id

  var displayName;
  var subject;
  var html;

  //query for the user's display name
  admin.database().ref('users/').child(uid).child('display_name').once('value', function(snap){
    displayName = snap.val();
  }).then(ok => {

    subject = 'Welcome! You are now a member of the NatureNet community.';

    html = '<html><body><p>Dear ' + displayName +
    ',<br><br>Congratulations, you are now a NatureNet member!<br><br>To make an observation from out in the field please install our phone app which is available on both Android and iOS.<br><br>' +
    'Don’t forget to tell us your design ideas--your suggestions for improving or adding new features or content to NatureNet--via the phone app or the NatureNet website at ' +
    '<a href = https://www.nature-net.org>www.nature-net.org</a>.<br><br>' +
    'Thank you for your interest in the NatureNet project,' +
    '<br>Naturenet Project Team</p></body>' +
    '<br><a href = "https://play.google.com/store/apps/details?id=org.naturenet&hl=en">Android</a><br><a href = "https://itunes.apple.com/us/app/naturenet/id1104382694">iOS</a></html>';

    sendEmailHtml(email, subject, html);  //send the email
  });

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
