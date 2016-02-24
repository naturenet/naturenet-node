# Deploys the security rules to all three firebase apps.
# If testing new rules you can just use `firebase deploy:rules`
# which will default to deploying only to the test application.

firebase deploy:rules --firebase naturenet-testing
firebase deploy:rules --firebase naturenet-staging
firebase deploy:rules --firebase naturenet
