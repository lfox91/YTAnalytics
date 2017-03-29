var express = require('express');
var router = express.Router();
var logger = require('morgan');
var env = process.env
var ACCESS_TOKEN = env.ACCESS_TOKEN || require('../gAuth').ACCESS_TOKEN;
var REFRESH_TOKEN = env.REFRESH_TOKEN ||require('../gAuth').REFRESH_TOKEN;
var CLIENT_ID = env.CLIENT_ID || require('../gAuth').CLIENT_ID;
var CLIENT_SECRET = env.CLIENT_SECRET || require('../gAuth').CLIENT_SECRET;
var CHANNEL_ID = env.CHANNEL_ID || require('../gAuth').CHANNEL_ID;
var SCOPES = [
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtubepartner',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube'
]
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

//create gapi OAUTH hard code ACCESS and REFRESH token
var auth = new OAuth2( CLIENT_ID, CLIENT_SECRET, 'localhost:3000' );

if(auth.createScopedRequired && auth.createScopedRequired()) {
  auth = auth.createScoped(SCOPES);
}

auth.setCredentials({
  access_token: ACCESS_TOKEN,
  refresh_token: REFRESH_TOKEN,
  expiry_date: (new Date()).getTime() + (1000 * 60 * 60 * 24 * 7)
});

router.post('/', function(req, res, next) {

  //parse request object
  var  metrics    = '',
      startDate  = req.body.sd,
      endDate    = req.body.ed,
      id         = req.body.vid,
      metricsArr = [];
  //// TODO: Error check inputs now
  for(var checked in req.body){
    if(req.body[checked] === 'on'){
      metricsArr.push(checked);
      metrics+=checked+',';
    }
  }
  metrics = metrics.slice(0,-1);

  var ytAnalytics = google.youtubeAnalytics({
    version: 'v1beta1',
    auth: auth,
    params: {
      ids: 'channel=='+CHANNEL_ID,
      'start-date': startDate,
      'end-date': endDate,
      metrics: metrics,
      filters: "video=="+id,
      dimensions: 'day'
    }
  });
  var youtube = google.youtube({
    version:'v3',
    auth: auth,
    params: {
      id: id,
      part: "snippet",
      maxResults: 1
    }
  });


  //Calls to Youtube API
  ytAnalytics.reports.query(function(err, ytAnalyticsObject){
    var data = {};
    var src = "https://www.youtube.com/embed/"+id;
    var dates = [];

    ytAnalyticsObject.rows.forEach(function(outerArr){
      var date = outerArr[0];
      var structuredDate= date.slice(5,7) + "/" + date.slice(8) + "/" + date.slice(2,4);
      dates.push(structuredDate);
      metricsArr.forEach(function(metricName, indexOfMetric){
        if(data[metricName]) {
          data[metricName].push(outerArr[indexOfMetric+1]);
        }
        else {
          data[metricName] = [outerArr[indexOfMetric+1]];
        }
      })
    })

    youtube.videos.list(function (err, ytSnippet) {
      var title = ytSnippet.items[0].snippet.title;
      if(err)console.log(err);
      res.render('graph', {
        data: JSON.stringify(data),
        src : src,
        name: title,
        dates: JSON.stringify(dates),
        title: title + " Analytics"
      });
    })
  })
});

module.exports = router;


//UC3akNK4ON7nwuIxL00IvBFg
