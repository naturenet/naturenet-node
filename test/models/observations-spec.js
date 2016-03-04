"use strict";

const chance = require('chance').Chance();
const should = require('should');
const Firebase = require('firebase')
const GeoFire = require('geofire');

const Utils = require('../test-utils');
const Activities = require('../../lib/models/activity');
const Sites = require('../../lib/models/site');

const client = new Firebase(process.env.FIREBASE_URL);

describe('/observations', () => {

    describe('permissions', () => {

        context('an authenticated client', () => {

            it('can read observations');

            it('can create observations');

            it('can update its own observations');

            it('cannot update others observations');

            it('can delete its own observations');

            it('cannot delete others observations');
        });

        context('an unauthenticated client', () => {

            it('can read observations');

            it('cannot create observations');

            it('cannot update observations');

            it('cannot delete observations');
        });
    });

    describe('validations', () => {

        it('must have an `id` field equal to its key in the parent');

        it('must have a `activity_location` field equal a valid activity_location key');

        it('must have an `observer` field equal to the id of the user creating it');

        it('must be able to set location data before the main record using GeoFire');

        it('cannot be submitted with additional fields');

        describe('missing data', () => {

            it('cannot be missing an id');

            it('cannot be missing an activity_location');

            it('cannot be missing an observer');

            it('cannot be missing a data object');
        });
    });
});

