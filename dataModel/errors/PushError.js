var util = require("util");
var Error = require('../../dataModel/errors/SimpleError.js');

var PushError = function (offset, errorText) {
	Error.call(this, Error.type.GIT_DATA_PUSHER_CANNOT_PUSH_EVENTS, errorText);
	/**
	 * The index of the first event which coudn't be Bulked
	 */
	this.nextIndex = offset;
}
util.inherits(PushError, Error);

module.exports = PushError;