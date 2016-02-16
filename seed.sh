#!/bin/sh
#
# Runs the database seed script with the '.env' variables loaded.
while read LINE; do
    export "$LINE"
done < .env

node lib/data/seed-firebase.js
