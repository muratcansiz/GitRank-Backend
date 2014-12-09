var http = require('http');

var elasticServer = {};
elasticServer.address = "localhost";
elasticServer.port = "9200";
elasticServer.eventDataBase = "/gitarch/event/";

var toto = {
  name:"YOUPI"
};


var GitArchDataPusher = {};
// Proxy settings
GitArchDataPusher.proxy = {};
GitArchDataPusher.proxy.add = ""; /** 'proxyweb.utc.fr' */
GitArchDataPusher.proxy.port = -1; /** 3128 */

// Last event id
GitArchDataPusher.lastId = 1;

// Adds an event to the elastic database.
// Important: events are duplicated if it already exist
GitArchDataPusher.postEvent = function(event, onError) {
  var options = {};
  options.method = 'POST';
  // A proxy is set
  if (GitArchDataPusher.proxy.add != "") {

  } else {
    options.host = elasticServer.address;
    options.port = elasticServer.port;
    options.agent = false;
    options.path = elasticServer.eventDataBase + GitArchDataPusher.lastId;
  }

  var req = http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    res.emit('close');
    res.removeAllListeners('data');
  }).on('error', function(e) {
    onError.call(this, "Couldn't post the event: " + event + "\ndetails: " + e);
  });
  console.log(req.write(event));
  req.end();
}


var main = function() {
  GitArchDataPusher.postEvent('{rep: "angularjs"}', function(e) {
    console.log(e);
  });
}
main();