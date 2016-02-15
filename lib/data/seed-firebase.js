'use strict';
const Sites = require('../models/site');
const Activities = require('../models/activity');

var last = Sites.drop()
    .then(ok => { return Activities.drop() })
    .then(ok => {
        let promises = [];

        let test0 = Sites.newRecord();
        test0.name = "test-0";
        test0.location = [0, 0];
        promises.push(test0.write());

        let test1 = Sites.newRecord({name: 'test-1', location: [1, 1]});
        promises.push(test1.write());

        let test2 = Sites.newRecord("test-2", {name: 'test-2', location: [2, 2]});
        promises.push(test2.write());

        return Promise.all(promises)
    });

last = last.then(ok => {
    let a = Activities.newRecord({
        name: "test-activity",
        description: "Some old thing",
        icon_url: 'http://res.cloudinary.com/university-of-colorado/image/upload/v1431461260/3_Tracks_k6imha.png',
        template: {
            web: 'http://www.naturenet.org/activities/test-activity',
            ios: 'http://www.naturenet.org/activities/test-activity-ios',
            andriod: 'http://www.naturenet.org/activities/test-activity-andriod'
        }
    });
    return a.write()
        .then(ok => {
            return a.addLocation([1, 2], {id: 'test-2'});
        });
})
.then(ok => {
    console.log("save complete");
    process.exit();
})
.catch(err => {
    console.log(err);
    process.exit();
})

