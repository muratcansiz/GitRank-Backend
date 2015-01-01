var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'debug'
});


client.search({
  index: 'gitarch',
  size: 999,
  body: {
    query: {
      match: {
        type: 'PushEvent'
      }
    }
  }
}).then(function (resp) {
   var hits = resp.hits.hits;
   console.log(hits[60])
   // var i = 0;
   // while(typeof hits[i] != 'undefined') {
   //    console.log(hits[i]._source.payload.repository.name);
   //    i++;
   // }
}, function (err) {
   console.trace(err.message);
});
