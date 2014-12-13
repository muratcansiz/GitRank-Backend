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
        language: 'JavaScript'
      }
    }
  }
}).then(function (resp) {
   var hits = resp.hits.hits;
   console.log(hits.length);
}, function (err) {
   console.trace(err.message);
});