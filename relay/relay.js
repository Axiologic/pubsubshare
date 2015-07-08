
var redis = require("redis");
var request = require("request");

function ns_getOrganisation(orgName, callback){
    if(orgName == "ORG1"){
        callback(null, {
            server:"localhost",
            port:8000
        });
    } else {
        callback(null, {
            server:"localhost",
            port:8001
        });
    }
}

function RedisPubSubClient(redisHost, redisPort, redisPassword, publishFunction){
    console.log("Connecting to:", redisPort, redisHost);

    var publishRedisClient = redis.createClient(redisPort, redisHost);
    var subscribeRedisClient = redis.createClient(redisPort);

    this.getCommandsClient = function (){
        return publishRedisClient;
    }

    this.subscribe = function(channel, callback){
        subscribeRedisClient.subscribe(channel,callback);
    }

    this.publish = function(channel, message, callback){
        publishRedisClient.publish(channel, message, callback);
    }
}


function createServer(port){
    var restify = require('restify');

    var server = restify.createServer({
        name: 'pubSubRelay',
        version: '1.0.0'
    });
    //server.use(restify.acceptParser(server.acceptable));

    //server.use(restify.bodyParser({ mapParams: false }));

    server.listen(port, function () {
        console.log('%s listening at %s', server.name, server.url);
    });

    return server;
}

exports.createRelay = function(organisationName, redisHost, redisPort, publicHost, publicPort, nsHost, nsPort){
  var redis = RedisPubSubClient(redisHost, redisPort, undefined);

    var server =  createServer(publicPort);
    server.post('/publish/:channel', function (req, res, next) {
        console.log("Request:" , req.params, req.body);

       // var jsonBody = JSON.parse(req.body);
        console.log("XXXXX");

        res.send(req.params);

        return next();
    });

    server.post('/proxy/:channel/:transferId', function (req, res, next) {
        console.log(res);
        res.send(req.params);
        return next();
    });

    /* usefull!?
    this.subscribe = function(){

    }

   this.publish = function(){

    }*/
}



exports.createClient = function(redisHost, redisPort, redisPassword){
    var client = new RedisPubSubClient(redisHost, redisPort, redisPassword);
    var oldPublish = client.publish;

    client.publish = function(channel, message, callback){
        var res = channel.match(/\w*:\/\/([\w\.]+[:]*\d*)\/(.*)/);
        if(res){
                var localChannel = res[2];
                ns_getOrganisation(res[1], function(err, res){

                    var url = "http://"+ res.server + ":" + res.port +"/publish/" + localChannel;
                    console.log("Post towards ", url, JSON.stringify(message));

                    request({
                        url: url, //URL to hit
                        qs: {from: 'blog example', time: +new Date()}, //Query string data
                        method: 'POST',
                        headers: {
                            'Content-Type': 'json/text'
                        },
                        body: JSON.stringify(message)
                    }, function(error, response, body){
                        if(error) {
                            console.log(error);
                        } else {
                            console.log(response.statusCode, body);
                        }
                    });
                })
            } else {
            oldPublish(channel, message, callback);
        }
    }
    return client;
}