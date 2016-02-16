#!/bin/sh
#
# Runs the tests with the '.env' variables loaded but replace the FIREBASE_ variables
# with their TEST_FIREBASE_ equivalents.
while read LINE; do
    export "$LINE"
done < .env

mocha --recursive
