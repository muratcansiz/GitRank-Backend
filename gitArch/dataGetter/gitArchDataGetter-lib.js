var http = require('http');
var fs = require('fs');
var connectionConfig = require('./connectionConfig');
var Error = require('../../dataModel/errors/SimpleError.js');

var eventFilter = function(event) {
  if (event.repository) {
    if (event.repository.language && event.repository.language == "JavaScript") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }

}

String.prototype.trunc = String.prototype.trunc ||
      function(n){
          return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
      };

// Static function to fetch data for a given string date
// date: {Year}-{Month}-{Day}-{Hour}
// example: 2012-04-11-15
// callback: function(array of events)
exports.getArchive = function getArchive(date, successCallback, errorCallback) {
  var options = {};


  options.method = 'GET';
  // A proxy is set
  if (connectionConfig.proxy.add != "") {
    options.host = connectionConfig.proxy.add;
    options.port = connectionConfig.proxy.port;
    options.path = "http://" + connectionConfig.host + "/" + date + connectionConfig.extension;
  } else {
    options.host = connectionConfig.host;
    options.port = 80;
    options.path = "/" + date + connectionConfig.extension;
  }

  // console.log("options.host " + options.host);
  // console.log("options.port " + options.port);
  // console.log("options.path " + options.path);

    http.get(options, function(res) {
      var body = '';

      var gunzip = require('zlib').createGunzip();

      res.pipe(gunzip);

      gunzip.on('data', function (data) {
          body += data;
      });
      var obj;
      gunzip.on('end', function() {
        //jsonLineDelimited = body.replace(/}{/g, '}\n{');
        jsonLineDelimited = body.replace(/}[\s]*[\n]*[\s]*{/g, '}\n{');
        // To save the file uncomment the following
        // 
       //  fs.writeFile("data.json", body, function(err) {
       //    if(err) {
       //        console.log(err);
       //    } else {
       //        console.log("The file was saved!");
       //    }
       // });

        body = '{"events":[' + body;
        body = body + ']}';
        body = body.replace(/}[\s]*[\n]*[\s]*{/g, '},{');
        var res = JSON.parse(body);
        var i = 0;
        var tab = [];
        res.events.forEach(function(evt) {
          if (eventFilter(evt)) {
            tab[i] = evt;
            i++;
          }
        });

        console.log("DATE: " + date);
        successCallback.call(this, tab);
      });

      gunzip.on('error', function() {
        errorCallback.call(this, new Error(Error.type.GITHUB_ARCHIVE_GUNZIP_ERROR, ""));
      });
    }).on('error', function(e) {
      errorCallback.call(this, new Error(Error.type.GITHUB_ARCHIVE_DOWNLOAD_ERROR, e));
    });
} 
