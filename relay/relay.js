
var redis = require("redis");
var request = require("request");

var RELAY_PUBSUB_CHANNEL_NAME = "PubSubRelay";

var CONFIGURATION_REQUEST_CHANNEL_NAME = "PubSub_CONFIGURATION_CHANNEL_REQUEST";
var CONFIGURATION_ANSWEAR_CHANNEL_NAME = "PubSub_CONFIGURATION_CHANNEL_ANSWEAR";


function RedisPubSubClient(redisHost, redisPort, redisPassword){
    console.log("Connecting to:", redisPort, redisHost);

    var publishRedisClient = redis.createClient(redisPort, redisHost, redisPassword);
    var subscribeRedisClient = redis.createClient(redisPort, redisHost, redisPassword);

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
                console.log("Non JSON object received from Redis!", res, channel);
            }
            c(obj);
        }
    })

    this.publish = function(channel, message, callback){
        publishRedisClient.publish(channel, message, callback);
    }
}


var busNode = require("./BusNode.js");

exports.createRelay = function(organisationName, redisHost, redisPort, publicHost, publicPort, keySpath, filesPath){
  var redis = new RedisPubSubClient(redisHost, redisPort, undefined);

    var server =  busNode.createHttpsNode(publicPort, keySpath, filesPath, redis);

    redis.subscribe(RELAY_PUBSUB_CHANNEL_NAME, function(envelope){
        busNode.pushMessage(keySpath, envelope.organisation, envelope.localChannel, envelope.message);
    })

    redis.subscribe(CONFIGURATION_REQUEST_CHANNEL_NAME, function(){
        console.log("Configuration request",organisationName )
        redis.publish(CONFIGURATION_ANSWEAR_CHANNEL_NAME, JSON.stringify({publicHost:publicHost, publicPort:publicPort, organisationName:organisationName}));
    })
}


exports.createClient = function(redisHost, redisPort, redisPassword){
    var client = new RedisPubSubClient(redisHost, redisPort, redisPassword);
    var oldPublish = client.publish;
    var publicFSHost;
    var publicFSPort;
    var organisationName;

    client.publish(CONFIGURATION_REQUEST_CHANNEL_NAME, JSON.stringify({ask:"config"}));
    client.subscribe(CONFIGURATION_ANSWEAR_CHANNEL_NAME, function(obj){
        publicFSHost = obj.publicHost;
        publicFSPort = obj.publicPort;
        organisationName = obj.organisationName;
        console.log("Got it:", organisationName, publicFSHost ,publicFSPort);
    })

    function tryToGetConfiguration(){
        if(!publicFSHost){
            console.log("Trying again", redisHost, redisPort);
            setTimeout(tryToGetConfiguration,300);
        }
    }

    tryToGetConfiguration();

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

    client.shareFile = function(path, callback){

        //var uid =

    }
    return client;
}