/**
 * The Data Access Object for the test application. This module handles Redis a
 *
 * @author jan.milota
 * @since 24.09.2016
 */

var fs = require('fs'),
	q = require('q'),
	redis = require('redis'),
	lockFile = require('lockfile'),
	config = require('./config.js'),
	client = redis.createClient({
		host: config.getRedisUrl(),
		port: config.getRedisPort()
	}),
	arraySlice = Array.prototype.slice,

	/**
	 * @private
	 *
	 * Converts the provided function to a function that returns then-able objects
	 *
	 * @param {Object} scope the scope the function will be applied to
	 * @param {Function} fn the converted function
	 * @return {Function}
	 */
	promisify = function (scope, fn) {
		return function () {

			var args = arraySlice.call(arguments, 0),
				d = q.defer();

			// Add a promise handler callback that rejects/resolves the promise depending on the passed error state
			args.push(function (err) {
				err ? d.reject(err)
					: d.resolve.apply(d, arraySlice.call(arguments, 1));
			});

			fn.apply(scope, args);
			return d.promise;
		};
	},

	// Promisify the API we are going to use
	fsMkDir = promisify(fs, fs.mkdir),
	fsAppendFile = promisify(fs, fs.appendFile),
	redisSet = promisify(client, client.set),
	redisGet = promisify(client, client.get),
	lfLock = promisify(lockFile, lockFile.lock),
	lfUnlock = promisify(lockFile, lockFile.unlock),

	/**
	 * Stores the JSON params to a file. Creates the appropriate directory tree and/or the file if either does not exist.
	 * @param {Object} params
	 */
	trackParams = function (params) {

		var dataFolder = config.getDataFolder(),
			trackFileName = config.getTrackFileName(),
			lockFilePath = dataFolder + '/' + 'lock_' + trackFileName,
			append = function () {
				return lfLock(lockFilePath, { retryWait: 100 }) // On lock acquisition failure retry in 100ms
					.then(fsAppendFile(dataFolder + '/' + trackFileName, JSON.stringify(params) + '\n'))
					.then(lfUnlock(lockFilePath));
			};

		return fsMkDir(dataFolder)
			.then(append, function (err) {
				if (err && err.code == 'EEXIST') {
					// This is OK, the directory already exists...
					return append();
				}
			});
	},

	/**
	 * Adds the provided number to the Redis DB to the already present `count` value
	 * @param {String/int} count the number to add
	 */
	addCount = function (count) {
		return redisGet('count')
			.then(function (result) {
				// Convert the values to integers, sum them up and put them back
				return redisSet('count', ((result || 0) >> 0) + (count >> 0));
			});
	},

	/**
	 * Fetches the current value under the `count` key
	 * @return {int/null}
	 */
	getCount = function () {
		return redisGet('count');
	};

/* PUBLIC API */

module.exports.trackParams = trackParams;
module.exports.addCount = addCount;
module.exports.getCount = getCount;