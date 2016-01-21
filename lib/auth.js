var basicAuth = require('basic-auth');
var Users = require('./db').Users;

/**
 * Authenticates a request based on the basic auth header.
 *
 * If the header is not present then no action is taken.
 *
 * If the header is present and can be decoded into a username and password then
 * authentication is attempted and a `Promise` placed on the request at `req.user`.
 * If authentication succeeds the promise will resolve to the user making the request.
 * If authentication fails the promise will resolve to `null`.
 */
var basic = function (req, res, next) {
    var credentials = basicAuth(req);
    if (credentials && credentials.name && credentials.pass) {
        req.user = Users.findOne({username: credentials.name})
            .exec()
            .then(
                function (user) {
                    if (!user) {
                        return null;
                    }
                    if (!user.compare_password(credentials.pass)) {
                        return null;
                    }
                    return user;
            }, function (err) {
                    console.log('Error trying to fetch user for basic auth request: ' + err);
                    return null;
            });
    }
    next();
}

module.exports.basic = basic;
