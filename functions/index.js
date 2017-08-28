'use strict'

const elsewhere = 'zz_elsewhere';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const GeoFire = require('geofire');

const nnemail = encodeURIComponent(functions.config().nn.email);
const nnp = encodeURIComponent(functions.config().nn.p);
const mailTransport = nodemailer.createTransport(`smtps://${nnemail}:${nnp}@smtp.gmail.com`);
const devEmails = ["mj_mahzoon@yahoo.com", "smacneil01@gmail.com", "rtrejo@uncc.edu"];
var mailOptions = {
  from: '"NatureNet" <noreply@nature-net.org>'
};

admin.initializeApp(functions.config().firebase);

exports.onWriteObservation = functions.database.ref('/observations/{obsId}').onWrite(event => {
  const observation = event.data.val();
  const id = event.params.obsId;

  // When the observation is first created
  if (!event.data.previous.exists()) {
    var post = {
      time: observation.created_at,
      context: "observations"
    };
    admin.database().ref('/users-private').child(observation.observer).child("my_posts").child(id).set(post)
      .catch(function(error) {
        console.log("Failed to add post (observation): " + error.message);
      });
  }

  // TODO: chain these cases with promises so they execute linearly in one pass
  // handling each case exclusively allows the event to trigger again to handle later cases

  if (!!observation && !!observation.status && observation.status.toLowerCase() === 'deleted') { // handle deleted status
    console.log('Observation deleted: ', id);

    admin.database().ref('/users-private').child(observation.observer).child("my_posts").child(id).remove()
      .catch(function(error) {
        console.log("Failed to delete post (observation): " + error.message);
      });

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
  } else if (!!observation && !observation.site) { // handle missing site
    console.log('Observation is missing valid site field: ', id);

    const user = observation.observer;
    return admin.database().ref('/users').child(user).child('affiliation').once('value', function(data) {
      if (!!data.val()) {
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

exports.onWriteIdea = functions.database.ref('/ideas/{ideaId}').onWrite(event => {
  const idea = event.data.val();
  const id = event.params.ideaId;

  //check to see if the idea is null. if so, simply return null so we don't do anything else
  //Note: idea deletion is handled in this method (around 30 lines down from here).
  if (idea == null) {
    return null;
  }

  var submitter = idea.submitter;

  // When the idea is first created
  if (!event.data.previous.exists()) {
    var post = {
      time: idea.created_at,
      context: "ideas"
    };
    admin.database().ref('/users-private').child(idea.submitter).child("my_posts").child(id).set(post)
      .catch(function(error) {
        console.log("Failed to add post (idea): " + error.message);
      });
    // send an email to the dev team about a new design idea
    var template = getEmailTemplate_NewIdeaDev(id, idea.content);
    devEmails.forEach(function(email) {
      sendEmail(email, template["subject"], template["content"], template["isHTML"]);
    });
    //send push notification to users about new idea
    sendPushNotification_NewIdea(id);
  }

  if (!!idea && !!idea.status && event.data.child('status').changed()) { // handle a change in status
    if (idea.status.toLowerCase() === 'deleted') { //handle deleted status
      console.log('Idea deleted: ', id);

      admin.database().ref('/users-private').child(idea.submitter).child("my_posts").child(id).remove()
        .catch(function(error) {
          console.log("Failed to delete post (idea): " + error.message);
        });

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
    } else { //otherwise, we know the status was changed to something else
      console.log('Status has changed on an idea: ' + idea.id);
      //get the user's email
      admin.auth().getUser(submitter).then(function(user) {
        var email = user.email;
        admin.database().ref('/users').child(submitter).once("value", function(snapshot1) {
          var displayName = snapshot1.val().display_name;
          var notification_token = snapshot1.val().notification_token;
          var template = getEmailTemplate_IdeaStatusChange(displayName, idea.status, idea.content);
          sendEmail(email, template["subject"], template["content"], template["isHTML"]);

          if(notification_token!=null){
            sendPushNotification_IdeaStatusChange(notification_token, id, idea.status);
          }
        });


      });
    }
  }
});

exports.onWriteComment = functions.database.ref('/comments/{commentId}').onWrite(event => {
  const comment = event.data.val();
  const comment_id = event.params.commentId;
  var parent_ref;

  if (event.data.current.exists()) { // the comment was created or edited

    //check to see what the context of the comment is
    if (comment.context == "observations")
      parent_ref = admin.database().ref('/observations').child(comment.parent).child("observer");
    if (comment.context == "ideas")
      parent_ref = admin.database().ref('/ideas').child(comment.parent).child("submitter");
    var post_id = comment.parent + "_" + comment.commenter;

    if (parent_ref) {
      parent_ref.once("value", function(snapshot) {
        //get the id of the idea/observation submitter
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
            .catch(function(error) {
              console.log("Failed to add the comment: " + error.message);
            });

          if (comment.commenter != parent_user_id) { //when original idea/observation submitter isn't the commenter

            admin.database().ref('/users').child(parent_user_id).child("display_name").once("value", function(snapshot1) {
              var the_parent_user_displayName = snapshot1.val();
              admin.database().ref('/users').child(comment.commenter).child("display_name").once("value", function(snapshot2) {
                var the_commenter_displayName = snapshot2.val();
                console.log("Sending email to " + comment.context + " submitter " + the_parent_user_displayName + " for " +
                  the_commenter_displayName + "'s comment.");

                //send email+notification to the observation/idea submitter about the new comment
                admin.auth().getUser(parent_user_id).then(function(user) {
                  // sending email
                  var email = user.email;
                  var template = getEmailTemplate_NewComment(the_commenter_displayName, the_parent_user_displayName,
                    comment.context.substring(0, comment.context.length -1), comment.comment);
                  sendEmail(email, template["subject"], template["content"], template["isHTML"]);
                  // sending notification
                  sendPushNotification_Comment(the_commenter_displayName,
                    parent_user_id,
                    comment.context,
                    comment.parent,
                    'New Comment',
                    the_commenter_displayName + ' commented on your ' + comment.context.substring(0, comment.context.length -1) + ".");
                });

              });
            });
          }

          //"sent" Set will hold references to users we've already sent emails to
          var sent = new Set();
          //send notification to all other participants of the comment thread below
          //here we query to find all the comments that belong to the specific observation/idea
          admin.database().ref('/comments').orderByChild('parent').equalTo(comment.parent).once('value', function(snapshot) {

            //iterate over all the previous comments for this observation/idea to send them notifications
            snapshot.forEach(function(data) {
              //id and username of person who has contributed to the thread
              var previousCommenterId = data.val().commenter;
              var previousCommenterName;
              //person who submitted the new comment
              var commenterName;

              //make sure the previous contributor isn't the same person as the new commenter and isn't the original poster of the observation/idea
              if (previousCommenterId != comment.commenter && previousCommenterId != parent_user_id) {

                //check to see if we've already sent a notification to this user
                if (!sent.has(previousCommenterId)) {

                  sent.add(previousCommenterId);
                  //query to get the username of the comment thread contributor so we can email them
                  admin.database().ref('/users').child(previousCommenterId).child('display_name').once('value', function(snap) {
                    previousCommenterName = snap.val();
                    //query to get the username of the person who commented
                    admin.database().ref('/users').child(comment.commenter).child('display_name').once('value', function(snap) {
                      commenterName = snap.val();

                      console.log('Sending email to ' + previousCommenterName + " for " + commenterName + "'s comment.");

                      admin.auth().getUser(previousCommenterId).then(function(user) {
                        var email = user.email;
                        var template = getEmailTemplate_NewReply(commenterName, previousCommenterName, comment.comment);
                        sendEmail(email, template["subject"], template["content"], template["isHTML"]);
                        // sending notification
                        sendPushNotification_Comment(commenterName,
                          previousCommenterId,
                          comment.context,
                          comment.parent,
                          'New Comment',
                          commenterName + ' commented on a ' + comment.context.substring(0, comment.context.length -1) + ".");
                      });
                    });
                  });
                }
              }
            });
          });
        } else { // the comment was edited
          var post = {
            updated_at: admin.database.ServerValue.TIMESTAMP,
            text: comment.comment,
            seen: false
          };
          admin.database().ref('/users-private').child(parent_user_id).child("comments").child(post_id).update(post)
            .catch(function(error) {
              console.log("Failed to update the comment: " + error.message);
            });
        }
      });
    }
  } else { //the comment was deleted
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
            .catch(function(error) {
              console.log("Failed to delete the comment: " + error.message);
            });
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

exports.onWriteObservationLike = functions.database.ref('/observations/{observationId}/likes/{userId}').onWrite(event => {
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
        .catch(function(error) {
          console.log("Failed to add post (observation-like): " + error.message);
        });
    } else {
      if (!event.data.current.exists()) { // the like value was deleted
        if (observer_id) {
          admin.database().ref('/users-private').child(observer_id).child("likes").child(post_id).remove()
            .catch(function(error) {
              console.log("Failed to delete post (observation-like): " + error.message);
            });
        }
      } else { // the like value was edited
        var post = {
          updated_at: admin.database.ServerValue.TIMESTAMP,
          value: like_value,
          seen: false
        };
        admin.database().ref('/users-private').child(observer_id).child("likes").child(post_id).update(post)
          .catch(function(error) {
            console.log("Failed to update post (observation-like): " + error.message);
          });
      }
    }
  });
});

exports.onWriteIdeaLike = functions.database.ref('/ideas/{ideaId}/likes/{userId}').onWrite(event => {
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
        .catch(function(error) {
          console.log("Failed to add post (idea-like): " + error.message);
        });
    } else {
      if (!event.data.current.exists()) { // the like value was deleted
        if (submitter_id) {
          admin.database().ref('/users-private').child(submitter_id).child("likes").child(post_id).remove()
            .catch(function(error) {
              console.log("Failed to delete post (idea-like): " + error.message);
            });
        }
      } else { // the like value was edited
        var post = {
          updated_at: admin.database.ServerValue.TIMESTAMP,
          value: like_value,
          seen: false
        };
        admin.database().ref('/users-private').child(submitter_id).child("likes").child(post_id).update(post)
          .catch(function(error) {
            console.log("Failed to update post (idea-like): " + error.message);
          });
      }
    }
  });
});

exports.onWriteActivity = functions.database.ref('/activities/{activityId}').onWrite(event => {
  const activity = event.data.val();
  const id = event.params.activityId;
  if (!event.data.previous.exists()) { // the project was first created
    var template = getEmailTemplate_NewActivity(id, activity.name, activity.description)
    devEmails.forEach(function(email) {
      sendEmail(email, template["subject"], template["content"], template["isHTML"]);
    });
    //send push notification to all users about the new project
    sendPushNotification_NewProject(id);
  }
});

exports.onWriteUser = functions.auth.user().onCreate(event => {

  //send Welcome email when a new user creates an account with NatureNet

  const user = event.data; //The Firebase user
  const email = user.email; //The Firebase user's email
  const uid = user.uid; //The Firebase user's id

  var displayName;
  var subject;
  var html;

  //query for the user's display name
  admin.database().ref('users/').child(uid).child('display_name').once('value', function(snap) {
    displayName = snap.val();
  }).then(ok => {
    var template = getEmailTemplate_NewUser(displayName);
    sendEmail(email, template["subject"], template["content"], template["isHTML"]);
  });

});

// utility functions

// returning idea status description for sending email notifications
function getIdeaStatusDescription(status) {
  if (status === 'done') {
    return "We are happy to inform you that your design idea has been implemented in NatureNet. We appreciate your contribution and hope you will continue sending us your new design ideas."
  } else if(status === 'doing'){
    return 'Currently, your NatureNet design idea is in the <b>discussing</b> phase.'
  } else {
    return 'Currently, your NatureNet design idea is in the <b>' + status + '</b> phase.'
  }
}

//This function sends email
function sendEmail(email, subject, content, isHTML) {
  mailOptions.to = email;
  mailOptions.subject = subject;
  if (isHTML) {
    mailOptions.html = content;
  } else {
    mailOptions.text = content;
  }

  //mailTransport.sendMail(mailOptions).then(() => {
    console.log('An email was sent to: ', email);
  //})
}

// push notification functions

function sendPushNotification_IdeaStatusChange(token, parent, status){
  //create the notification payload
  if(status == "doing"){
    status = "discussing";
  }
  let payload = {
    notification: {
      title: 'Idea Status Change',
      body: 'The status of your idea has changed to "' + status + '."',
      sound: "default",
      click_action: "android.intent.action.MAINACTIVITY"
    },
    data: {
      title: 'Idea Status Change',
      context: 'ideas',
      parent: parent,
      body: 'The status of your idea has changed to "' + status + '."',
      sound: 'default'
    }
  };

  admin.messaging().sendToDevice(token, payload).then(ok => {
    console.log('Push notification sent about the status change of idea: ' + parent);
  });
}

function sendPushNotification_NewIdea(parent){
  let payload = {
    notification: {
      title: 'New Design Idea',
      body: 'Check out this new design idea. Do you want to comment?',
      sound: "default",
      click_action: "android.intent.action.MAINACTIVITY"
    },
    data: {
      title: 'New Design Idea',
      context: 'ideas',
      parent: parent,
      body: 'Check out this new design idea. Do you want to comment?',
      sound: 'default'
    }
  };

  admin.messaging().sendToTopic('ideas', payload).then(function(){
    console.log('Succesfully sent new idea notification to ideas topic subscribers');
  });
}

function sendPushNotification_NewProject(parent){

  let payload = {
    notification: {
      title: 'New Project',
      body: 'Check out our new project. Do you want to contribute?',
      sound: "default",
      click_action: "android.intent.action.MAINACTIVITY"
    },
    data: {
      title: 'New Project',
      context: 'activities',
      parent: parent,
      body: 'Check out our new project. Do you want to contribute?',
      sound: 'default'
    }
  };

  admin.messaging().sendToTopic('activities', payload).then(ok =>{
    console.log('Succesfully sent new project notification to project topic subscribers');
  });
}

function sendPushNotification_Comment(commenterName, contributerId, context, contributionId, title, body) {
  // send notification to the contributer about a new comment
  admin.database().ref('/users').child(contributerId).child('notification_token').once('value', function(snap) {
    var userToken = snap.val();
    // make sure the user has a token
    if (userToken != null) {
      console.log('Sending notification to: ' + contributerId);
      //create the notification payload
      let payload = {
        notification: {
          title: title,
          body: body,
          sound: "default",
          click_action: "android.intent.action.MAINACTIVITY"
        },
        data: {
          title: title,
          context: context,
          parent: contributionId,
          body: body,
          sound: 'default'
        }
      };
      //send the notification
      return admin.messaging().sendToDevice(userToken, payload).then(ok => {
        console.log('Notification sent to: ' + contributerId);
      }).catch(error => {
        console.log('Could not send notification.');
      });
    }
  });
}

// email templates

function getEmailTemplate_NewIdeaDev(ideaId, ideaContent) {
  var template = {}
  template["subject"] = "[NatureNet] A new design idea was added.";
  template["content"] = "Hi, \n\nA new design idea was just created by a NatureNet user. As your time allows, please review to see that it falls within project guidelines.\n\nThe design idea info:\nId: " + ideaId +
      "\nText: " + ideaContent +
      "\n\nRegards,\nNatureNet Team";
  template["isHTML"] = false;
  return template;
}

function getEmailTemplate_NewActivity(activityId, activityName, activityDescription) {
  var template = {}
  template["subject"] = "[NatureNet] A new project was added";
  template["content"] = "Hi, \n\nA new project was just created by a NatureNet user. As your time allows, please review to see that it falls within project guidelines.\n\nThe project info:\nId: " + activityId +
      "\nName: " + activityName +
      "\nDescription: " + activityDescription +
      "\n\nRegards,\nNatureNet Team";
  template["isHTML"] = false;
  return template;
}

function getEmailTemplate_IdeaStatusChange(userName, ideaStatus, ideaContent) {
  var template = {}
  template["subject"] = "The status of your NatureNet design idea has changed.";
  template["content"] = '<html><body><p>' +
          'Dear ' + userName + ',<br /><br />' +
          getIdeaStatusDescription(ideaStatus) + '<br /><br />' +
          'Your design idea:<br />"' + ideaContent +
          '"<br />See the design ideas on the website: <a href = https://www.nature-net.org/ideas>www.nature-net.org/ideas</a>' +
          '<br /><br />Sincerely,<br />NatureNet Project Team</p></body></html>';
  template["isHTML"] = true;
  return template;
}

function getEmailTemplate_NewComment(commenterName, contributerName, context, comment) {
  var template = {}
  template["subject"] = commenterName + " commented on your NatureNet contribution";
  template["content"] = '<html><body><p>' +
          'Dear ' + contributerName + ',<br /><br />' +
          'Recently, ' + commenterName + ' commented on your ' + context + ':<br />' +
          '"' + comment + '"<br /><br />' +
          "Want to reply? Click <a href = https://www.nature-net.org>here</a> to reply, see others' contributions, or leave comments.<br /><br />" +
          "Don't forget to share your design ideas and/or comments on the NatureNet website and mobile apps. Your participation strengthens the community.<br /><br />" +
          'Sincerely, <br />NatureNet Project Team</p></body></html>';
  template["isHTML"] = true;
  return template;
}

function getEmailTemplate_NewReply(commenterName, contributerName, comment) {
  var template = {}
  template["subject"] = commenterName + " comments on a NatureNet contribution: " + comment.substring(0, 15) + "...";
  template["content"] = '<html><body><p>' +
          'Dear ' + contributerName + ',<br /><br />' +
          'Recently, ' + commenterName + ' commented:<br />' +
          '"' + comment + '"<br /><br />' +
          'See the comment thread in context: ' + '<a href = https://www.nature-net.org>www.nature-net.org</a><br /><br />' +
          'Sincerely, <br />NatureNet Project Team</p></body></html>';
  template["isHTML"] = true;
  return template;
}

function getEmailTemplate_NewUser(userName) {
  var template = {}
  template["subject"] = "Welcome! You are now a member of the NatureNet Community";
  template["content"] = '<html><body><p>' +
          'Dear ' + userName + ',<br /><br />' +
          'Congratulations, you are now a NatureNet member!<br /><br />' +
          'To make an observation from out in the field please install our phone app which is available on both Android and iOS:<br />' +
          '<a href = "https://play.google.com/store/apps/details?id=org.naturenet&hl=en">Android version</a><br />' +
          '<a href = "https://itunes.apple.com/us/app/naturenet/id1104382694">iOS version</a><br /><br />' +
          'Don’t forget to tell us your design ideas--your suggestions for improving or adding new features or content to NatureNet--via the phone app or the NatureNet website at ' +
          '<a href = https://www.nature-net.org>www.nature-net.org</a>.<br /><br />' +
          'Thank you for your interest in the NatureNet project, <br />' +
          'Naturenet Project Team</p></body></html>';
  template["isHTML"] = true;
  return template;
}
