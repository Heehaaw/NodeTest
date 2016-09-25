/**
 * The app entry point
 *
 * @author jan.milota
 * @since 24.09.2016
 */

var express = require('express'),
	bodyParser = require('body-parser'),
	morgan = require('morgan'),
	q = require('q'),
	config = require('./lib/config.js'),
	// In this simple case there is no need for writing a facade layer so the server part will call a DAL directly.
	dao = require('./lib/dao.js'),
	app = express(),
	appPort = config.getAppPort(),

	/**
	 * @typedef {Object} ResponseBody
	 * @property {Boolean} success indicates whether everything has gone OK
	 * @property {*} [reason] if there was en error, this property contains an explanation
	 */
	/**
	 * @private
	 * @param {*} [err]
	 * @return {ResponseBody}
	 */
	createResponseBody = function (err) {
		var responseBody = { success: !err };
		if (err) {
			responseBody.reason = err;
		}
		return responseBody;
	},
	/**
	 * @private
	 * @param {Object} response
	 * @return {Function}
	 */
	getErrorHandler = function (response) {
		return function (err) {
			console.log(err);
			response.status(500).json(createResponseBody(err));
		}
	};

/* MIDDLEWARE */

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(morgan('combined'));

/* ROUTES */

// Listen for POST requests on the `track` route. The params sent with the request are then stored locally. If there is a `count` argument, it flushed into the DB.
// Accepts either url-encoded params or straight-up JSON.
app.post('/track', function (req, res) {

	if (req.body && req.body.count) {
		q.all([dao.addCount(req.body.count), dao.trackParams(req.body)])
			.then(function () {
				res.json(createResponseBody());
			}, getErrorHandler(res))
			.done();
	}
	else {
		dao.trackParams(req.body)
			.then(function () {
				res.json(createResponseBody());
			}, getErrorHandler(res))
			.done();
	}
});

// Listen for GET requests on the `count` route. The actual `count` value gets fetched into the response.
app.get('/count', function (req, res) {
	dao.getCount()
		.then(function (count) {
			var responseBody = createResponseBody();
			responseBody.count = count;
			res.json(responseBody);
		}, getErrorHandler(res));
});

app = app.listen(appPort, function () {
	console.log('Listening on port [' + appPort + ']');
});

/* PUBLIC API */

module.exports = app;
