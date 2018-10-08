var express = require('express');
const MongoClient = require("mongodb").MongoClient;

const url = 'mongodb://localhost:27017/tweets';
//Initialize the express App
var app = express();
var server = require('http').Server(app);
var path = require('path');
var bodyParser = require('body-parser');
var io = require('socket.io')(server);;
//Twitter
var Twitter = require('twitter');
var request = require("request");


var client = new Twitter({
    consumer_key: 'YOUR CONSUMER KEY',
    consumer_secret: 'YOUR CONSUMER SECRET',
    access_token_key: 'YOUR ACCESS TOKEN',
    access_token_secret: 'YOUR ACCESS TOKEN SECRET'
});

const port = process.env.PORT || 3000;
server.listen(port);
console.log("Server listening at : ", port);
//Default Route
app.get('/', function (req, res) {
    res.set({
        'Access-Control-Allow-Origin': '*'
    });
    return res.redirect('/public/index.html');
});

app.use('/public', express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));


io.on('connection', function (socket) {
    //Default event just for testing
    socket.emit('welcome', {
        data: 'welcome'
    });
    //Keyword event is handled here
    socket.on('keyword', function (data) {
        console.log(data);
        console.log('Before calling api');
        var keyword = data.keyword;
        try {
            var stream = client.stream('statuses/filter', {
                track: keyword
            });
        } catch (error) {
            console.log('Unable to fetch data from twitter : ', Error)
        }
        console.log('After calling api');
        stream.on('data', function (event) {
            var tweet = event.text;
            var user = event.user.name;
            console.log('In data');
            MongoClient.connect(url, {
                useNewUrlParser: true
            }, function (err, client) {
                if (err) {
                    console.log('unable to connect to database : ', err);
                    throw err
                }
                //Find all documents in the customers collection:

                console.log('Successfully connected to database...');
                tweetData = {
                    'keyword': keyword,
                    'user': user,
                    'tweet': tweet
                }
                const db = client.db('tweets')
                db.collection("tweet").insert(tweetData, function (err, res) {
                    if (err) throw err;
                    else {
                        var content = {
                            keyword: keyword,
                            user: user,
                            tweet: tweet
                        }
                        console.log("Keyword is ::>> " + keyword);
                        console.log("Tweeted by ::>>" + event.user.name);
                        console.log("Tweet is ::>>" + event.text);
                        console.log('Details added successfully');
                        //Emitting the data using sockets
                        socket.emit('livetweets', {
                            data: content
                        })
                    }
                });
                socket.on('stop', function (data) {
                    db.close();
                });
            });

        });

        stream.on('error', function (error) {
            console.log('Error is happen : ', Error)
            throw error;
        });
    });
});