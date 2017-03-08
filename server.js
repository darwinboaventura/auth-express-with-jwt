var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');

var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var User   = require('./app/models/user'); // get our mongoose model

var port = process.env.PORT || 8080;
mongoose.connect(config.database);
app.set('superSecret', config.secret);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(morgan('dev'));

app.get('/', function(req, res) {
	res.send("Hello! The API is at http://localhost:" + port + "/api");
});

app.get('/setup', function(req, res) {
	var nick = new User({
		name: 'Nick Cerminara',
		password: 'password',
		admin: true
	});

	nick.save(function(err) {
		if (err) throw err;

		console.log("User saved sucessfully");

		res.json({success: true});
	});
});

var apiRoutes = express.Router();

apiRoutes.post('/authenticate', function(req, res) {
	// find the user
	User.findOne({
		name: req.body.name
	}, function(err, user) {
		if (err) throw err;

		if (!user) {
			res.json({ success: false, message: 'Authentication failed. User not found.' });
		} else if (user) {
			// check if password matches
			if (user.password != req.body.password) {
				res.json({ success: false, message: 'Authentication failed. Wrong password.' });
			} else {
				// if user is found and password is right
				// create a token
				var token = jwt.sign(user, app.get('superSecret'), {});

				// return the information including token as JSON
				res.json({
					success: true,
					message: 'Enjoy your token!',
					token: token
				});
			}
		}
	});
});

apiRoutes.use(function(req, res, next) {
	var token = req.body.token || req.query.token || req.headers['x-access-token'];

	// decode token
	if (token) {
		// verifies secret and checks exp
		jwt.verify(token, app.get('superSecret'), function(err, decoded) {
			if (err) {
				return res.json({ success: false, message: 'Failed to authenticate token.' });
			} else {
				// if everything is good, save to request for use in other routes
				req.decoded = decoded;
				next();
			}
		});
	} else {
		// if there is no token
		// return an error
		return res.status(403).send({
			success: false,
			message: 'No token provided.'
		});
	}
});

apiRoutes.get('/', function(req, res) {
	res.json({message: 'Welcome to the coolest API on earth!'});
});

apiRoutes.get('/users', function(req, res) {
	User.find({}, function(err, users) {
		if (err) throw (err);

		res.json(users);
	});
});

app.use('/api', apiRoutes);

app.listen(port);

console.log("Magic happens at http://localhost" + port);