var GitArchDataGetter = require('gitArch-dataGetter-lib');

var main = function() {
  GitArchDataGetter.proxy.add = "proxyweb.utc.fr"
  GitArchDataGetter.proxy.port = 3128;

  GitArchDataGetter.getDataFor("2012-04-11-22", function(events) {
    console.log("Entries successfully retrieved: " + events.length);
  });
}

main();