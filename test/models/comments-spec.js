"use strict";

const chance = require('chance').Chance();
const should = require('should');
const Firebase = require('firebase')
const GeoFire = require('geofire');

const Utils = require('../test-utils');
const Activities = require('../../lib/models/activity');
const Sites = require('../../lib/models/site');

const client = new Firebase(process.env.FIREBASE_URL);

describe('comments', () => {

    describe('permissions', () => {

        context('an authenticated client', () => {

            it('can comment on its own records');

            it('can comment on others records');

            it('can update comments it owns');

            it('cannot update others comments');

            it('can delete comments it owns');

            it('cannot delete others comments');

            it('can delete others comments on records it owns');
        });

        context('an unauthenticated client', () => {

            it('cannot create comments');

            it('cannot update comments');

            it('cannot delete comments');
        });
    });

    describe('validations', () => {

        it('must have a `commenter` field equal to the id of the user creating it');

        it('cannot be submitted with additional fields');

        describe('missing data', () => {

            it('cannot be missing an commenter');

            it('cannot be missing a comment');
        });
    });
});

