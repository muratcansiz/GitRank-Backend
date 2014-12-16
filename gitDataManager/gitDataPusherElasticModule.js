var elasticsearch = require('elasticsearch');
var fs = require('fs');

// Object used to push 
var GitEventDataPusher = {};

// Elastic database default conf
GitEventDataPusher.elasticIp = "localhost";
GitEventDataPusher.elasticPort = "9200";
GitEventDataPusher.gitArchIndex = "gitarch";
GitEventDataPusher.snapShotRepositoryName = "_gitarcheventsbackuprepository";
GitEventDataPusher.snapShotRepositoryLocation = "C:/Users/Murat/Desktop/COURS/IC05/backend/elasticsearch/backups";
GitEventDataPusher.snapShotName = "gitarcheventssnapshot";
GitEventDataPusher.MAX_EVENT_PER_BULK = 1000;
GitEventDataPusher.eventType = "event";
//GitEventDataPusher.lastEventIp = 0;
GitEventDataPusher.lastEventIpFile = __dirname + "/lastEventIp.json";

// Elastic client used to manage the db
GitEventDataPusher.elasticClient = null;

// Intitializing the client
exports.init = function init(_onSucces, _onError) {
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
      // Checking if the snapshot exist
      GitEventDataPusher.elasticClient.snapshot.get({
          repository: GitEventDataPusher.snapShotRepositoryName,
          snapshot: GitEventDataPusher.snapShotName
        }, function(err, response, status) {
          if (err && status == "404") {
            //cool
            // Creating the snapshot repository
            GitEventDataPusher.elasticClient.snapshot.createRepository({
              timeout: 3000,
              repository: GitEventDataPusher.snapShotRepositoryName,
              body: {
                type: 'fs',
                settings: { location: GitEventDataPusher.snapShotRepositoryLocation, compress: true  }
              }
            }, function(err, response, status) {
              if(err) {
                throw "Snapshot repository couldn't be created, error: "+ err;
              } else {
                console.log("Created repository, status: " + status);
                _onSucces.call(this)
              }
            });
          } else {
            GitEventDataPusher.elasticClient.snapshot.delete({
              method: "DELETE",
              repository: GitEventDataPusher.snapShotRepositoryName,
              snapshot: GitEventDataPusher.snapShotName
            }, function(err, response, status) {
              if (err) {
                console.log("[** GitEventDataPusher.startBulks **] ini(), unexpected:\n" + err.toString());
                _onError.call(self, err, "UNEXPECTED");
              } else {
                // Creating the snapshot repository
                GitEventDataPusher.elasticClient.snapshot.createRepository({
                  timeout: 3000,
                  repository: GitEventDataPusher.snapShotRepositoryName,
                  body: {
                    type: 'fs',
                    settings: { location: GitEventDataPusher.snapShotRepositoryLocation, compress: true  }
                  }
                }, function(err, response, status) {
                  if(err) {
                    throw "Snapshot repository couldn't be created, error: "+ err;
                  } else {
                    console.log("Created repository, status: " + status);
                    _onSucces.call(this)
                  }
                }); 
              }
            });
          }
        });
    
    }
  });

};

// Add a collection of events as a single bulk
exports.pushEvents = function pushEvents(arrayOfEvents, _onSucces, _onError) {
  if (!GitEventDataPusher.elasticClient) throw "GitEventDataPusher.pushEvents: call init() before performing any operation.";
  GitEventDataPusher.startBulks(arrayOfEvents, 0, _onSucces, _onError);

}

GitEventDataPusher.startBulks = function (events, start, _onSucces, _onError) {
  var counter = 0;
  var i  = start;
  var reducedEvents = [];

  if (start >= start.length) {
    return;
  }


  while (counter < GitEventDataPusher.MAX_EVENT_PER_BULK &&
     i < events.length) {
    reducedEvents[counter] = events[i];
    counter ++;
    i ++;
  }

  var bulker = new GitEventDataPusher.EventBulkManager(events, reducedEvents,
     GitEventDataPusher.elasticClient, true, i);
  bulker.startBulk(function() {
    if (this.originOffset + GitEventDataPusher.MAX_EVENT_PER_BULK >= this.allEvents.length) {
      console.log("[** GitEventDataPusher.startBulks **] Successful last bulk, calling _onSucces");
      _onSucces.call(this);
    } else {
      GitEventDataPusher.startBulks(this.allEvents, this.originOffset, _onSucces, _onError);
    }
  }, function(errs, status, firstEventToBePushed) {
    _onError.call(this, errs, status, firstEventToBePushed);
  });
};



GitEventDataPusher.EventBulkManager = function(allEvts, evts, client, withRetry, offSt) {
  this.bodyReq = [];
  this.originOffset = offSt;
  this.retry = withRetry;
  this.startedBulks = 0;
  this.elasticClient = client;
  this.allEvents = allEvts;
  var action = {};
  var i = 0;
  var j = 0;
  while (i < evts.length) {
    evt = evts[i];
    action = { index: {} };
    this.bodyReq[j] = action;
    this.bodyReq[j + 1] = evt;
    i ++;
    j += 2;
    action = null;
  }
};


GitEventDataPusher.EventBulkManager.prototype.startBulk = function(_onSucces, _onError) {
  this.startedBulks ++;
  var self = this;
  // Creating a snapshot before attempting a bulk
  
  this.elasticClient.snapshot.create({
    method: "PUT",
    repository: GitEventDataPusher.snapShotRepositoryName,
    snapshot: GitEventDataPusher.snapShotName
  }, function(err, response, status) {
    if (err) {
      console.log("[** GitEventDataPusher.startBulks **] Couldn't create the snapshot, status: " + status + " \n" + err.toString());
      _onError.call(self, err, self.originOffset);
    } else {
      self.elasticClient.bulk({
        type: GitEventDataPusher.eventType,
        index: GitEventDataPusher.gitArchIndex,
        timeout: 20000,
        body: self.bodyReq
      }, function(err, response, status) {
        if (err) {
          // restoring before the data base.
          self.elasticClient.snapshot.restore({
            repository: GitEventDataPusher.snapShotRepositoryName,
            snapshot: GitEventDataPusher.snapShotName
          }, function(err, response, status) {
            if (err) {
              console.log("[** GitEventDataPusher.startBulks **] Couldn't restore the snapshot:\n" + err.toString());
              _onError.call(self, err, self.originOffset);
            } else {
              if (self.startedBulks < GitEventDataPusher.EventBulkManager.MAX_RETRY_ATTEMPT) {
                self.startedBulks ++;
                self.startBulk(_onSucces, _onError)
              } else {
                console.log("[** GitEventDataPusher.startBulks **] Max retry attempt reached, aborting.");
                _onError.call(self, err, self.originOffset);
              } 
            }
          });
        } else {
          console.log("[** GitEventDataPusher.startBulks **] Bulk done successfully");
          self.elasticClient.snapshot.delete({
            method: "DELETE",
            repository: GitEventDataPusher.snapShotRepositoryName,
            snapshot: GitEventDataPusher.snapShotName
          }, function(err, response, status) {
            if (err) {
              console.log("[** GitEventDataPusher.startBulks **] Couldn't delete the snapshot:\n" + err.toString());
              _onError.call(self, err, self.originOffset);
            } else {
              _onSucces.call(self);
            }
          });
        }
      });
    }
  });

}

GitEventDataPusher.EventBulkManager.prototype.release = function() {
  this.bodyReq = null;
  this.elasticClient = null;
}

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