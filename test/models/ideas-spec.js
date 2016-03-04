"use strict";

const chance = require('chance').Chance();
const should = require('should');
const Firebase = require('firebase')
const GeoFire = require('geofire');

const Utils = require('../test-utils');
const Activities = require('../../lib/models/activity');
const Sites = require('../../lib/models/site');

const client = new Firebase(process.env.FIREBASE_URL);

describe('/ideas', () => {

    describe('permissions', () => {

        context('an authenticated client', () => {

            it('can read ideas');

            it('can create ideas');

            it('can update its own ideas');

            it('cannot update others ideas');

            it('can delete its own ideas');

            it('cannot delete others ideas');

            it('can comment on its own ideas');

            it('can comment on others ideas');

            it('can update comments it owns');

            it('cannot update others comments');

            it('can delete comments it owns');

            it('cannot delete others comments');

            it('can delete others comments on ideas it owns');
        });

        context('an unauthenticated client', () => {

            it('can read ideas');

            it('cannot create ideas');

            it('cannot update ideas');

            it('cannot delete ideas');

            it('cannot update comments');

            it('cannot delete comments');
        });
    });

    describe('validations', () => {

        it('must have an `id` field equal to its key in the parent');

        it('must have a `submitter` field equal to the id of the user creating it');

        it('must have an `icon_url` field that is a link');

        it('cannot be submitted with additional fields');

        describe('missing data', () => {

            it('cannot be missing an id');

            it('cannot be missing a group');

            it('cannot be missing content');

            it('cannot be missing an icon_url');

            it('cannot be missing a submitter');
        });
    });
});

