var request = require("sync-request");

module.exports = function(link) {
	return request('GET',link).getBody();
};