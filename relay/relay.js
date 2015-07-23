
var redis = require("redis");
var request = require("request");

var RELAY_PUBSUB_CHANNEL_NAME = "PubSubRelay";

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

    var listeners = {};


    this.getCommandsClient = function (){
        return publishRedisClient;
    }

    this.subscribe = function(channel, callback){
        subscribeRedisClient.subscribe(channel);
        listeners[channel] =  callback;
    }

    subscribeRedisClient.on("message", function(channel, res){
        var c = listeners[channel];
        var obj;
        if(c){
            try{
                obj = JSON.parse(res);
            } catch(err){
                obj = res;
            }
            c(obj);
        }
    })

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

    server.use(restify.bodyParser({ mapParams: false }));

    server.listen(port, function () {
        console.log('%s listening at %s', server.name, server.url);
    });

    return server;
}

exports.createRelay = function(organisationName, redisHost, redisPort, publicHost, publicPort, nsHost, nsPort){
  var redis = new RedisPubSubClient(redisHost, redisPort, undefined);

    var server =  createServer(publicPort);
    server.post('/publish/:channel', function (req, res, next) {
        //console.log("Forwarding message towards", req.params.channel);
        redis.publish(req.params.channel, req.body);
        res.send("success");
        return next();
    });

    server.post('/proxy/:channel/:transferId', function (req, res, next) {
        console.log(res);
        res.send(req.params);
        return next();
    });

    function pushMessage(localChannel, organisation, strMessage){
        ns_getOrganisation( organisation, function(err, res){
            var url = "http://"+ res.server + ":" + res.port +"/publish/" + localChannel;

            request({
                url: url, //URL to hit
                qs: {from: 'pub/sub relay', time: +new Date()}, //Query string data
                method: 'POST',
                headers: {
                    'Content-Type': 'json/text'
                },
                body: strMessage
            }, function(error, response, body){
                if(error) {
                    console.log(error);
                } else {
                    //console.log(response.statusCode, body);
                }
            });
        })
    }

    redis.subscribe(RELAY_PUBSUB_CHANNEL_NAME, function(envelope){
        //console.log("Envelope:", envelope);
        pushMessage(envelope.localChannel, envelope.organisation, envelope.message);
    })
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
        var strMessage;
        if(typeof message == "string"){
            strMessage = message;
        } else {
            strMessage = JSON.stringify(message);
        }
        var res = channel.match(/\w*:\/\/([\w\.]+[:]*\d*)\/(.*)/);
        if(res){
                var envelope = {
                    localChannel:res[2],
                    organisation:res[1],
                    message:strMessage
                }
            oldPublish(RELAY_PUBSUB_CHANNEL_NAME, JSON.stringify(envelope), callback);
            } else {
            oldPublish(channel, strMessage, callback);
        }
    }
    return client;
}