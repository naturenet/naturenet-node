#!/bin/sh

while read LINE; do
    export "$LINE"
done < .env

export FIREBASE_URL="$PROD_URL"
export FIREBASE_SECRET="$PROD_SECRET"

node lib/data/apply-timestamps.js
