var elasticsearch = require('elasticsearch');



/*****************************/
var http = require('http');
var gunzip = require('zlib').createGunzip();
var fs = require('fs');


String.prototype.trunc = String.prototype.trunc ||
      function(n){
          return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
      };


var GitArchDataGetter = {};

// Proxy settings
GitArchDataGetter.proxy = {};
GitArchDataGetter.proxy.add = ""; /** 'proxyweb.utc.fr' */
GitArchDataGetter.proxy.port = -1; /** 3128 */

// Data to build the URL
GitArchDataGetter.host = "data.githubarchive.org"
GitArchDataGetter.extension = ".json.gz"

// Static function to fetch data for a given string date
// date: {Year}-{Month}-{Day}-{Hour}
// example: 2012-04-11-15
// callback: function(array of events)
GitArchDataGetter.getDataFor = function(date, callback) {
  var options = {};
  options.method = 'GET';
  // A proxy is set
  if (GitArchDataGetter.proxy.add != "") {
    options.host = GitArchDataGetter.proxy.add;
    options.port = GitArchDataGetter.proxy.port;
    options.path = "http://" + GitArchDataGetter.host + "/" + date + GitArchDataGetter.extension;
  } else {
    options.host = GitArchDataGetter.host;
    options.port = 80;
    options.path = "/" + date + GitArchDataGetter.extension;
  }

  try {

    http.get(options, function(res) {
      var body = '';

      res.pipe(gunzip);

      gunzip.on('data', function (data) {
          body += data;
      });
      var obj;
      gunzip.on('end', function() {
        jsonLineDelimited = body.replace(/}{/g, '}\n{');
        // To save the file uncomment the following
      /*  fs.writeFile("data.json", jsonLineDelimited, function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("The file was saved!");
          }
       });*/

        body = '{"events":[' + body;
        body = body + ']}';
        body = body.replace(/}{/g, '},{');
        var res = JSON.parse(body);
        tab = res.events;
        callback.call(this, tab);
      });
    });
  } catch (e) {console.log(e)}

} 






/******************************************************************/


// Object used to push 
var GitEventDataPusher = {};

// Elastic database default conf
GitEventDataPusher.elasticIp = "127.0.0.1";
GitEventDataPusher.elasticPort = "9200";
GitEventDataPusher.gitArchIndex = "gitarch";
GitEventDataPusher.eventType = "event";

// Elastic client used to manage the db
GitEventDataPusher.elasticClient = 0;

// Intitializing the client
GitEventDataPusher.init = function () {
  GitEventDataPusher.elasticClient = new elasticsearch.Client({
    // host: "'" + GitEventDataPusher.elasticIp + ":" + GitEventDataPusher.elasticPort + "'"
    host: 'localhost:9200'
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
GitEventDataPusher.pushEvents = function(arrayOfEvents) {
  if (!GitEventDataPusher.elasticClient) throw "GitEventDataPusher.pushEvents: call init() before performing any operation.";

  // Creating the body of bulk, structure:
  /*
      .
      .
      .
        // the document's type and index
      { index:  { _index: 'myindex', _type: 'mytype', _id: 1 } },
        // the document to index
      { title: 'foo' },
      .
      .
      .
  */
  var bodyReq = [];
  var action = {};
  var evt;
  var ind;
  var i;
  for(i = 0; i < arrayOfEvents.length; i++) {
    evt = arrayOfEvents[i];
    action = { index:  { _index: GitEventDataPusher.gitArchIndex, _type: GitEventDataPusher.eventType,  _id: i} };
    bodyReq[i] = action;
    bodyReq[i + 1] = evt;
    i++;
  }

  GitEventDataPusher.elasticClient.bulk({
    body: bodyReq
  }).then(function(body) {
    
  }, function(error) {
    console.log("Couldn't add the events:\n" + error.toString());
  });
}

var main = function() {
 /* GitArchDataGetter.proxy.add = "proxyweb.utc.fr"
  GitArchDataGetter.proxy.port = 3128;*/
  GitEventDataPusher.init();
  GitArchDataGetter.getDataFor("2012-04-11-22", function(events) {
    console.log("Entries successfully retrieved: " + events.length);
    console.log("Pushing events.");
    GitEventDataPusher.pushEvents(events);
  });
}
main();