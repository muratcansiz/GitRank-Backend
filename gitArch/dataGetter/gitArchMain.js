//var GitArchDataGetter = require('gitArch-dataGetter-lib');
var GitArchSync = require('./gitArchSyncGithubArchive.js');
var GitArchDataGetter = require('./gitArchDataGetter-lib');

var main = function() {
  // GitArchDataGetter.proxy.add = "proxyweb.utc.fr"
  // GitArchDataGetter.proxy.port = 3128;

  var startDate = new Date();
  GitArchSync.syncGithubArchive();

  //GitArchSync.syncGithubArchive();
  // GitArchDataGetter.getArchive("2012-04-11-22", function(events) {
  //   console.log("Entries successfully retrieved: " + events.length);
  // });
}

main();