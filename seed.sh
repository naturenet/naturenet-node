#!/bin/sh
#
# Runs the database seed script against the staging and test
# databases
while read LINE; do
    export "$LINE"
done < .env


export FIREBASE_URL="$PROD_URL"
export FIREBASE_SECRET="$PROD_SECRET"

node lib/data/seed-firebase.js
