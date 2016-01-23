var User = require('../db').User;
var express = require('express');
var router = express.Router();

/**
 * Creates a `User` and returns the model after a successful save.
 */
router.post('/signup', (req, res) => {
    var user = new User({username: req.body.username});
    user.store_password(req.body.password);
    user.save().then(
        created => {
            var plain = created.toObject();
            delete plain.password;
            res.status(201).send(plain);
        },
        error => {
            res.status(400).send(error);
    });
});

/**
 * Attempts to login a user based on the post body of the request. If the
 * passed credentials are valid the response will set a session cookie.
 *
 * @todo the whole session cookie thing.
 */
router.post('/login', (req, res) => {
    var name = req.body.username;
    var pass = req.body.password;
    if (!name || !pass) {
        res.status(400)
            .send({ status: 400, message: 'missing username or password' });
        return;
    }

    User.findOne({username: name}).then(
        user => {
            if (!user || !user.compare_password(pass)) {
                res.status(400)
                    .send({ status: 400, message: 'username or password does not match' });
                return;
            }
            res.sendStatus(200);
        },
        error => {
            res.status(500).send(error);
        }
    );
})

module.exports = router;
