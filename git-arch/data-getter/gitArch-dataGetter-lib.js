var http = require('http');
var gunzip = require('zlib').createGunzip();
var fs = require('fs');


String.prototype.trunc = String.prototype.trunc ||
      function(n){
          return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
      };


exports.GitArchDataGetter = {};

// Proxy settings
exports.proxy = {};
exports.proxy.add = ""; /** 'proxyweb.utc.fr' */
exports.proxy.port = -1; /** 3128 */

// Data to build the URL
exports.host = "data.githubarchive.org"
exports.extension = ".json.gz"

// Static function to fetch data for a given string date
// date: {Year}-{Month}-{Day}-{Hour}
// example: 2012-04-11-15
// callback: function(array of events)
exports.getDataFor = function getDataFor(date, callback) {
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
