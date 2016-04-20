#!/bin/sh
#
# Runs the database migration scripts against the staging and test
# databases
while read LINE; do
    export "$LINE"
done < .env

ruby postgres-migrate/migrate.rb

export FIREBASE_URL="$PROD_URL"
export FIREBASE_SECRET="$PROD_SECRET"

node postgres-migrate/upload.js
