var elasticsearch = require('elasticsearch');
var fs = require('fs');

// Object used to push 
var GitEventDataPusher = {};

// Elastic database default conf
GitEventDataPusher.elasticIp = "127.0.0.1";
GitEventDataPusher.elasticPort = "9200";
GitEventDataPusher.gitArchIndex = "gitarch";
GitEventDataPusher.MAX_EVENT_PER_BULK = 500;
GitEventDataPusher.eventType = "event";
//GitEventDataPusher.lastEventIp = 0;
GitEventDataPusher.lastEventIpFile = __dirname + "/lastEventIp.json";

// Elastic client used to manage the db
GitEventDataPusher.elasticClient = null;

// Intitializing the client
exports.init = function init() {
  GitEventDataPusher.elasticClient = new elasticsearch.Client({
    host: GitEventDataPusher.elasticIp + ":" + GitEventDataPusher.elasticPort,
    keepAlive: false
  });
  // testing the client
  GitEventDataPusher.elasticClient.ping({
    requestTimeout: 10000,
    // undocumented params are appended to the query string
    hello: "elasticsearch!"
  }, function (error) {
    if (error) {
      throw 'Elasticsearch cluster is down:' + error;
    } else {
      console.log('Elasticsearch cluster is well.');
    }
  });
};

// Add a collection of events as a single bulk
exports.pushEvents = function pushEvents(arrayOfEvents) {
  if (!GitEventDataPusher.elasticClient) throw "GitEventDataPusher.pushEvents: call init() before performing any operation.";
  GitEventDataPusher.startBulks(arrayOfEvents, 0);

}

GitEventDataPusher.startBulks = function (events, start) {
  var bodyReq = [];
  var action = {};
  var evt; 
  var i = start;
  var j = 0;
  var counter = 0;
  
  if (start >= events.length) {
    return;
  }

  while (i < events.length && counter < GitEventDataPusher.MAX_EVENT_PER_BULK) {
    evt = events[i];
    action = { index: {} };
    bodyReq[j] = action;
    bodyReq[j + 1] = evt;
    i ++;
    j += 2;
    counter ++;
  }
  console.log("bulk STARTED");
  GitEventDataPusher.elasticClient.bulk({
    type: GitEventDataPusher.eventType,
    index: GitEventDataPusher.gitArchIndex,
    timeout: 500000,
    body: bodyReq
  }).then(function(body) {
    if (body.errors == true) {
      throw "Some errors occured during the bulk";
    } else {
      console.log("Bulk done successfully");
      GitEventDataPusher.startBulks(events, i);
    }
    return;
  }, function(error) {
    console.log("Couldn't add the events:\n" + error.toString());
    console.log("i              :" + i);
    return;
  });
};

// var main = function() {
//   GitArchDataGetter.proxy.add = "proxyweb.utc.fr"
//   GitArchDataGetter.proxy.port = 3128;
//   GitEventDataPusher.init();
//   GitArchDataGetter.getDataFor("2014-12-01-16", function(events) {
//     console.log("Entries successfully retrieved: " + events.length);
//     console.log("Pushing events.");
//     GitEventDataPusher.pushEvents(events);
//   });
// };
// main();