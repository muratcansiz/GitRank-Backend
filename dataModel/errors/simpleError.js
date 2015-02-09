/**
 * Class used to handle basic errors.
 */


var Error = function (errorType, errorText) {
	this.errType = errorType;
	this.errText = errorText;
}
Error.GITHUB_ARCHIVE_DOWNLOAD_ERROR = "GITHUB_ARCHIVE_DOWNLOAD_ERROR";
Error.GITHUB_ARCHIVE_GUNZIP_ERROR = "GITHUB_ARCHIVE_GUNZIP_ERROR";

Error.prototype.toString = function() {
	return("Error type:" + this.errType + "\n" + "Description:" + this.errText);
}

module.exports = Error;