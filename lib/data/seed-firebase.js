'use strict';
const Sites = require('../models/site');
const Activities = require('../models/activity');
const Users = require('../models/user');
const Observations = require('../models/observation');

function dropTestUsers() {
    return new Promise((resolve, reject) => {
        Users.root.orderByChild('testuser').equalTo(true).once("value", snapshot => {
            let list = snapshot.val();
            let deletions = []
            for (var id in list) {
                let remove = Users.root.removeUser({email: list[id].email, password: 'testuser'})
                    .then(ok => { return Users.root.child(id).remove() });
                deletions.push(remove);
            }
            Promise.all(deletions).then(ok => {
                return Users.drop();
            })
            .then(ok => resolve())
            .catch(error => reject(error));
        }, error => {
            reject(err);
        });
    });
}

var testsites = [];

var last = Sites.drop()
    .then(ok => { return Activities.drop() })
    .then(ok => { return dropTestUsers() })
    .then(ok => { return Observations.drop() })
    .then(ok => {
        let promises = [];

        let test0 = Sites.newRecord();
        test0.name = "test-0";
        test0.location = [0, 0];
        promises.push(test0.write().then(site => { testsites.push(site); }));

        let test1 = Sites.newRecord({name: 'test-1', location: [1, 1]});
        promises.push(test1.write().then(site => { testsites.push(site); }));

        let test2 = Sites.newRecord("test-2", {name: 'test-2', location: [2, 2]});
        promises.push(test2.write().then(site => { testsites.push(site); }));

        return Promise.all(promises)
    });

var testactivities = [];

last = last.then(ok => {
    Activities.newRecord({
        name: "test-activity",
        description: "Some old thing",
        icon_url: 'http://res.cloudinary.com/university-of-colorado/image/upload/v1431461260/3_Tracks_k6imha.png',
        template: {
            web: 'http://www.naturenet.org/activities/test-activity',
            ios: 'http://www.naturenet.org/activities/test-activity-ios',
            andriod: 'http://www.naturenet.org/activities/test-activity-andriod'
        }
    }).write()
        .then(activity => {
            testactivities.push(activity)
            return activity.addLocation([1, 2], {id: 'test-2'});
        });
});

var testusers = [];

last = last.then(ok => {
    return Users.signup('jason@jasonmaher.me', "testuser", {
        display_name: 'Jason Maher',
        avatar: "http://res.cloudinary.com/university-of-colorado/image/upload/v1427400563/2_Snow_rutfs8.png",
        consent: {
            record: true,
            survey: true
        },
        affiliation: null,
        testuser: true
    }).then(user => { testusers.push(user); });
})

var testobservations = [];

last = last.then(ok => {
    return testactivities[0].locations().then(list => {
        return Observations.newRecord({
            activity_location: list[0],
            observer: testusers[0].id,
            location: [3, 3],
            data: {
                foo: 'bar',
                baz: 2,
                ducks: true
            }
        }).write().then(obs => { testobservations.push(obs) });
    });
})
.then(ok => {
    console.log("save complete");
    process.exit();
})
.catch(err => {
    console.log(err);
    process.exit();
});

