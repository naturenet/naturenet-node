'use strict'

const chai = require('chai');
const assert = chai.assert;
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const sinon = require('sinon');

describe('Cloud Functions', () => {
    var myFunctions, configStub, adminInitStub, functions, admin;

    before(() => {
        admin = require('firebase-admin');
        adminInitStub = sinon.stub(admin, 'initializeApp');
        functions = require('firebase-functions');
        configStub = sinon.stub(functions, 'config').returns({
            firebase: {
                databaseURL: 'https://null.firebaseio.com',
                storageBucket: 'null.appspot.com',
            }
        });
        myFunctions = require('../index');
    });

    after(() => {
        configStub.restore();
        adminInitStub.restore();
    });

    describe('deleteObservation', () => {
        it('should remove an observation marked deleted and copy it to /observations-deleted', () => {
            const oldData = {
                content: 'this observation should be deleted',
            };
            const newData = {
                content: 'this observation should be deleted',
                status: 'deleted'
            };
            const fakeEvent = {
                data: new functions.database.DeltaSnapshot(null, null, oldData, 'input', 'observations/foo')
            };

            const refParam = '/observations-deleted/${id}';
            const dbStub = sinon.stub(admin, 'database');
            const refStub = sinon.stub();
            const setStub = sinon.stub();
            const adminStub = sinon.stub();
            const removeStub = sinon.stub();

            dbStub.returns({ ref: refStub });
            refStub.withArgs(refParam).returns({ set: setStub });
            setStub.withArgs(newData).returns(Promise.resolve({ ref: 'new_ref' }));
            Object.defineProperty(fakeEvent.data, 'adminRef', { get: adminStub });
            adminStub.returns({ remove: removeStub });
            removeStub.returns(Promise.resolve(true));

            return assert.eventually.equal(myFunctions.quarantineObservation(fakeEvent), true);
        });
    });
});