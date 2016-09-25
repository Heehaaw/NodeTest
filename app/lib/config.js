/**
 * The application configuration
 *
 * @author jan.milota
 * @since 24.09.2016
 */

/**
 * @typedef {Object} Config
 * @property {int} APP_PORT the application port. Defaults to 8080.
 * @property {int} REDIS_URL the URL the Redis port. Defaults to 'localhost'.
 * @property {int} REDIS_PORT the Redis port. Defaults to 9090.
 * @property {String} DATA_FOLDER the folder to store data files to. Defaults to './data'.
 * @property {String} TRACK_FILE_NAME the name for the file the POST request params will be stored into. Defaults to 'track.txt'.
 */
var config = {
	APP_PORT: process.env.APP_PORT || 8080,
	REDIS_URL: process.env.REDIS_URL || 'localhost',
	REDIS_PORT: process.env.REDIS_PORT || 9090,
	DATA_FOLDER: process.env.DATA_FOLDER || './data',
	TRACK_FILE_NAME: 'track.txt'
};

/* PUBLIC API */
module.exports.getAppPort = function () {
	return config.APP_PORT;
};
module.exports.getRedisUrl = function () {
	return config.REDIS_URL;
};
module.exports.getRedisPort = function () {
	return config.REDIS_PORT;
};
module.exports.getDataFolder = function () {
	return config.DATA_FOLDER;
};
module.exports.getTrackFileName = function () {
	return config.TRACK_FILE_NAME;
};