/**
 * Class used to handle basic errors.
 */

exports.GITHUB_ARCHIVE_DOWNLOAD_ERROR = "GITHUB_ARCHIVE_DOWNLOAD_ERROR";
exports.GITHUB_ARCHIVE_DOWNLOAD_ERROR = "GITHUB_ARCHIVE_DOWNLOAD_ERROR";

exports.function (errorType, errorText) {
	this.errType = errorType;
	this.errText = errorText;
}

exports.prototype.toString() = function() {
	return("Error type:" + errType + "\n" + "Description:" + errText);
}