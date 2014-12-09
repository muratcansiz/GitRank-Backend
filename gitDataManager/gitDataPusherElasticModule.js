var elasticsearch = require('elasticsearch');
var fs = require('fs');



/*****************************/
var http = require('http');
var gunzip = require('zlib').createGunzip();
var JSONStream = require('JSONStream');
var parser = JSONStream.parse();

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
        //jsonLineDelimited = body.replace(/}{/g, '}\n{');
        jsonLineDelimited = body.replace(/}[\s]*[\n]*[\s]*{/g, '}\n{');
        // To save the file uncomment the following
       /* fs.writeFile("data.json", body, function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("The file was saved!");
          }
       });*/

        body = '{"events":[' + body;
        body = body + ']}';
        // body = body.replace(/}[\s]*[\n]*[\s]*{/g, '},{');
        body = body.replace(/}[[\s|\n]*]*{/g, '},{');
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
GitEventDataPusher.MAX_EVENT_PER_BULK = 500;
GitEventDataPusher.eventType = "event";
GitEventDataPusher.lastEventIp = 0;
GitEventDataPusher.lastEventIpFile = __dirname + "/lastEventIp.json";

// Elastic client used to manage the db
GitEventDataPusher.elasticClient = null;

// Intitializing the client
GitEventDataPusher.init = function () {
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
      GitEventDataPusher.readLastIp();
    }
  });
};

GitEventDataPusher.readLastIp = function(callback) {
  try {
    var data = fs.readFileSync(GitEventDataPusher.lastEventIpFile, {flag: "r"});
    var obj = JSON.parse(data);
    console.log("LAST EVENT IP:" + obj.lastIp);
    GitEventDataPusher.lastEventIp = obj.lastIp;
  }
  catch (err) {console.log("GitEventDataPusher.readLastIp:" + err)}
};

GitEventDataPusher.writeAndSetLastIp = function(i) {
  fs.writeFile(GitEventDataPusher.lastEventIpFile, "{ \"lastIp\": " + i + "}", function(err) {
    if(err) {
        throw err;
    }
    GitEventDataPusher.lastEventIp = i;
  });
};


// Add a collection of events as a single bulk
GitEventDataPusher.pushEvents = function(arrayOfEvents) {
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
    GitEventDataPusher.writeAndSetLastIp(i + GitEventDataPusher.lastEventIp);
    return;
  }

  while (i < events.length && counter < GitEventDataPusher.MAX_EVENT_PER_BULK) {
    evt = events[i];
    action = { index: { _id: i + GitEventDataPusher.lastEventIp } };
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

var main = function() {
  GitArchDataGetter.proxy.add = "proxyweb.utc.fr"
  GitArchDataGetter.proxy.port = 3128;
  GitEventDataPusher.init();
  GitArchDataGetter.getDataFor("2014-12-01-16", function(events) {
    console.log("Entries successfully retrieved: " + events.length);
    console.log("Pushing events.");
    GitEventDataPusher.pushEvents(events);
  });
};
main();