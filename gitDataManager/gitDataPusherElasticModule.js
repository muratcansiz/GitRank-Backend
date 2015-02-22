var elasticsearch = require('elasticsearch');
var fs = require('fs');
var GitEventDataPusherConfig = require('./gitDataPusherConfig');
var Error = require('../dataModel/errors/SimpleError.js');
var PushError = require('../dataModel/errors/PushError.js');
var LOGGER = require('./util.js');


// Object used to push 
var GitEventDataPusher = {};

// Elastic database default conf
GitEventDataPusher.elasticIp = GitEventDataPusherConfig.elasticIp;
GitEventDataPusher.elasticPort = GitEventDataPusherConfig.elasticPort;
GitEventDataPusher.gitArchIndex = GitEventDataPusherConfig.gitArchIndex;
GitEventDataPusher.snapShotRepositoryName = GitEventDataPusherConfig.snapShotRepositoryName;
GitEventDataPusher.snapShotRepositoryLocation = GitEventDataPusherConfig.snapShotRepositoryLocation;
GitEventDataPusher.snapShotName = GitEventDataPusherConfig.snapShotName;
GitEventDataPusher.MAX_EVENT_PER_BULK = GitEventDataPusherConfig.MAX_EVENT_PER_BULK;
GitEventDataPusher.eventType = GitEventDataPusherConfig.eventType;
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
      _onError.call(this, new Error(Error.ELASTIC_IS_DOWN, "Elastic search is not responding after timeout."));
    } else {
      console.log('Elasticsearch cluster is well.');
      LOGGER.logGitRank('Elasticsearch cluster is well.');
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
                _onError.call(this, new Error(Error.type.ELASTIC_CANNOT_CREATE_SNAPSHOT_REPOSITORY, "" + err));
              } else {
                console.log("Created repository, status: " + status);
                LOGGER.logGitRank("Created repository, status: " + status);
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
                LOGGER.logGitRank("[** GitEventDataPusher.startBulks **] ini(), unexpected:\n" + err.toString());
                _onError.call(this, new Error(Error.type.ELASTIC_CANNOT_DELETE_SNAPSHOT, "" + err));
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
                    _onError.call(this, new Error(Error.type.ELASTIC_CANNOT_CREATE_SNAPSHOT_REPOSITORY, "" + err));
                  } else {
                    console.log("Created repository, status: " + status);
                    LOGGER.logGitRank("Created repository, status: " + status);
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
  if (arrayOfEvents.length == 0) {
    console.log("[** pushEvents **] No events to be pushed.");
    LOGGER.logGitRank("[** pushEvents **] No events to be pushed.");
    _onSucces.call(this);
  }
  if (!GitEventDataPusher.elasticClient) _onError.call(this, new Error(Error.type.GIT_DATA_PUSHER_CALL_INIT_FIRST, ""));
  GitEventDataPusher.startBulks(arrayOfEvents, 0, _onSucces, _onError);

}

GitEventDataPusher.startBulks = function (events, start, _onSucces, _onError) {
  var counter = 0;
  var i  = start;
  var reducedEvents = [];

  if (start >= events.length) {
    return;
  }


  while (counter < GitEventDataPusher.MAX_EVENT_PER_BULK &&
     i < events.length) {
    reducedEvents[counter] = events[i];
    counter ++;
    i ++;
  }

  var bulker = new GitEventDataPusher.EventBulkManager(events, reducedEvents,
     GitEventDataPusher.elasticClient, true, start);
  bulker.startBulk(function() {
    if (this.originOffset + GitEventDataPusher.MAX_EVENT_PER_BULK >= this.allEvents.length) {
      console.log("[** GitEventDataPusher.startBulks **] Successful last bulk, calling _onSucces");
      LOGGER.logGitRank("[** GitEventDataPusher.startBulks **] Successful last bulk, calling _onSucces");
      _onSucces.call(this);
    } else {
      GitEventDataPusher.startBulks(this.allEvents, this.originOffset + GitEventDataPusher.MAX_EVENT_PER_BULK
        , _onSucces, _onError);
    }
  }, function(error) {
    _onError.call(this, error);
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
      LOGGER.logGitRank("[** GitEventDataPusher.startBulks **] Couldn't create the snapshot, status: " + status + " \n" + err.toString());
      // _onError.call(self, err, self.originOffset);
      _onError.call(self, new PushError(self.originOffset, "Couldn't create the snapshot" + err.toString()));
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
              LOGGER.logGitRank("[** GitEventDataPusher.startBulks **] Couldn't restore the snapshot:\n" + err.toString());
              // _onError.call(self, err, self.originOffset);
              _onError.call(self, new PushError(self.originOffset, "Couldn't restore the snapshot:" + err.toString()));
            } else {
              if (self.startedBulks < GitEventDataPusher.EventBulkManager.MAX_RETRY_ATTEMPT) {
                self.startedBulks ++;
                self.startBulk(_onSucces, _onError)
              } else {
                console.log("[** GitEventDataPusher.startBulks **] Max retry attempt reached, aborting.");
                LOGGER.logGitRank("[** GitEventDataPusher.startBulks **] Max retry attempt reached, aborting.");
                // _onError.call(self, err, self.originOffset);
                _onError.call(self,  new PushError(self.originOffset, "Max retry attempt reached, aborting."));
              } 
            }
          });
        } else {
          console.log("[** GitEventDataPusher.startBulks **] Bulk done successfully");
          LOGGER.logGitRank("[** GitEventDataPusher.startBulks **] Bulk done successfully");
          self.elasticClient.snapshot.delete({
            method: "DELETE",
            repository: GitEventDataPusher.snapShotRepositoryName,
            snapshot: GitEventDataPusher.snapShotName
          }, function(err, response, status) {
            if (err) {
              console.log("[** GitEventDataPusher.startBulks **] Couldn't delete the snapshot:\n" + err.toString());
              LOGGER.logGitRank("[** GitEventDataPusher.startBulks **] Couldn't delete the snapshot:\n" + err.toString());
              // _onError.call(self, err, self.originOffset);
              _onError.call(self, new PushError(self.originOffset, "Couldn't delete the snapshot:" + err.toString()));
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
