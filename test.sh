#!/bin/sh
#
# Runs the tests against the testing database
while read LINE; do
    export "$LINE"
done < .env

export FIREBASE_URL="$TEST_URL"
export FIREBASE_SECRET="$TEST_SECRET"

mocha --recursive
