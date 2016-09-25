/**
 * The test class for the app. Responsible for checking all the DAO + server functionality.
 *
 * @author jan.milota
 * @since 24.09.2016
 */

var mocha = require('mocha'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	redis = require('redis'),
	fakeredis = require('fakeredis'),
	sinon = require('sinon'),
	fs = require('fs'),
	q = require('q'),
	config = require('../lib/config.js'),
	describe = mocha.describe,
	it = mocha.it,
	expect = chai.expect,

	// We need a different track file so we do not mess up the application one
	testTrackFileName = new Date().getTime() + '_' + config.getTrackFileName(),
	trackFilePath = config.getDataFolder() + '/' + testTrackFileName,
	dao, client, app,

	/**
	 * @private
	 *
	 * Sets up the testing suite. Makes sure the `before` and `after` Mocha hooks are set.
	 */
	setupSuite = function () {

		mocha.before(function () {
			// Stub the functions so we can fake the DB connection and the track file location
			sinon.stub(redis, 'createClient', fakeredis.createClient);
			sinon.stub(config, 'getTrackFileName', function () {
				return testTrackFileName;
			});
			// We have to require the modules after they will have been stubbed
			app = require('../app.js');
			dao = require('../lib/dao.js');
			client = redis.createClient();
		});

		mocha.after(function () {
			// Get rid of the stubs and clean up the test track file
			redis.createClient.restore();
			config.getTrackFileName.restore();
			fs.unlink(trackFilePath, function (err) {
				expect(err).to.be.null;
			});
		});

		mocha.afterEach(function (done) {
			// Nuke all the DB keys after every suite so we are ready for another round
			client.flushdb(done);
		});
	},
	/**
	 * @private
	 *
	 * Asserts a response and an interconnected error (if present).
	 *
	 * @param {*} err
	 * @param {Object} res
	 */
	assertResponse = function (err, res) {
		expect(err).to.be.null;
		expect(res).to.have.status(200);
		expect(res.body).to.be.a('object');
		expect(res.body).to.have.property('success').eql(true);
	},
	/**
	 * @private
	 *
	 * Asserts a list of property names and their values in the provided `data` object.
	 *
	 * @param {Object} data
	 * @param {Array} properties
	 * @param {Array} expectedValues
	 */
	assertProperties = function (data, properties, expectedValues) {
		var i = properties && properties.length || 0;
		while (i--) {
			expect(data).to.have.property(properties[i]).eql(expectedValues[i]);
		}
	},
	/**
	 * @private
	 *
	 * Asserts the `count` value by comparing the provided value with the one the DAO returns.
	 *
	 * @param {int/null} count
	 * @param {Function} callback
	 */
	assertCount = function (count, callback) {
		dao.getCount()
			.then(function (result) {
				expect(result).to.equal(count);
				callback();
			});
	},
	/**
	 * @private
	 *
	 * Reads the test track file and parses its lines.
	 *
	 * @param {Function} callback a function accepting an Array of objects representing the parsed data
	 */
	readTrackFile = function (callback) {

		// Reading the whole file at once is indeed not the very best pattern to use.
		// In this case, however, we have full control over the file and complete knowledge of the insides.
		fs.readFile(trackFilePath, 'utf-8', function (err, data) {

			expect(err).to.be.null;
			data = data.split('\n');

			var result = [],
				i = 0,
				len = data && data.length || 0;

			for (; i < len; i++) {
				if (data[i]) {
					result.push(JSON.parse(data[i]));
				}
			}

			callback(result);
		});
	};

/* MIDDLEWARE */

chai.use(chaiHttp);

/* TEST SUITES */

describe('Track file tests', function () {

	var a = 1, b = 2, c = '3', d = '4',
		jsonParams = { a: a, b: b },
		urlParams = 'c=' + c + '&d=' + d;

	setupSuite();

	it('JSON request param tracking test (no count)', function (done) {

		chai.request(app)
			.post('/track')
			.send(jsonParams)
			.end(function (err, res) {
				assertResponse(err, res);
				readTrackFile(function (data) {
					assertProperties(data[0], ['a', 'b'], [a, b]);
					assertCount(null, done);
				});
			});
	});

	it('URL request param tracking test (no count)', function (done) {

		chai.request(app)
			.post('/track')
			.send(urlParams)
			.end(function (err, res) {
				assertResponse(err, res);
				readTrackFile(function (data) {
					assertProperties(data[0], ['a', 'b'], [a, b]);
					assertProperties(data[1], ['c', 'd'], [c, d]);
					assertCount(null, done);
				});
			});
	});
});

describe('Count tests', function () {

	var count = 10,
		jsonParams = { count: count },
		urlParams = 'count=' + count;

	setupSuite();

	it('Initial count test (should be null)', function (done) {
		assertCount(null, done);
	});

	it('Track JSON params with count', function (done) {

		chai.request(app)
			.post('/track')
			.send(jsonParams)
			.end(function (err, res) {
				assertResponse(err, res);
				assertCount(count, done);
			});
	});

	it('Count fetch test', function (done) {

		chai.request(app)
			.get('/count')
			.end(function (err, res) {
				assertResponse(err, res);
				assertProperties(res.body, ['count'], [count]);
				done();
			});
	});

	it('Track URL params with count increment', function (done) {

		chai.request(app)
			.post('/track')
			.send(urlParams)
			.end(function (err, res) {
				assertResponse(err, res);
				assertCount(count * 2, done);
			});
	});
});