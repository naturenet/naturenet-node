#!/bin/sh
#
# Runs the database seed script against the staging and test
# databases
while read LINE; do
    export "$LINE"
done < .env

export FIREBASE_URL="$TEST_URL"
export FIREBASE_SECRET="$TEST_SECRET"

node lib/data/seed-firebase.js

export FIREBASE_URL="$STAGING_URL"
export FIREBASE_SECRET="$STAGING_SECRET"

node lib/data/seed-firebase.js
