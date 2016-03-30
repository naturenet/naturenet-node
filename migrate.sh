#!/bin/sh
#
# Runs the database migration scripts against the staging and test
# databases
while read LINE; do
    export "$LINE"
done < .env

ruby postgres-migrate/migrate.rb

export FIREBASE_URL="$STAGING_URL"
export FIREBASE_SECRET="$STAGING_SECRET"

node postgres-migrate/upload.js
