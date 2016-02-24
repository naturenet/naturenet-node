#!/bin/sh
#
# Starts the naturenet worker locally using nodemon to auto-restart on any
# changes.
while read LINE; do
    export "$LINE"
done < .env

export FIREBASE_URL="$STAGING_URL"
export FIREBASE_SECRET="$STAGING_SECRET"

nodemon app.js
