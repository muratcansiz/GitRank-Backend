var http = require('http');
var gunzip = require('zlib').createGunzip();
var fs = require('fs');
var connectionConfig = require('./connection-config');

String.prototype.trunc = String.prototype.trunc ||
      function(n){
          return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
      };

// Static function to fetch data for a given string date
// date: {Year}-{Month}-{Day}-{Hour}
// example: 2012-04-11-15
// callback: function(array of events)
exports.getArchive = function getArchive(date, callback) {
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

  console.log("options.host " + options.host);
  console.log("options.port " + options.port);
  console.log("options.path " + options.path);

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
        // To save the file uncomment the following
        fs.writeFile(__dirname + "data.json", body, function(err) {
          if(err) {
              console.log(err);
          } else {
              console.log("The file was saved!");
          }
       });

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
