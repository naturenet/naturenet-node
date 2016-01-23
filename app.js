var _ = require('lodash');

var express = require('express');
var bodyParser = require('body-parser');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var auth = require('./lib/auth');
app.use(auth.basic);

app.use('/users', require('./lib/routes/user'));

app.set('port', (process.env.PORT || 5000));
app.listen(app.get('port'), () => {
    console.log("NatureNet up and running on port %s", app.get('port'));
});
