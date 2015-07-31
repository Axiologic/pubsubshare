
var redis = require("redis");
var request = require("request");

var RELAY_PUBSUB_CHANNEL_NAME = "PubSubRelay";


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


var busNode = require("./BusNode.js");

exports.createRelay = function(organisationName, redisHost, redisPort, publicHost, publicPort, keySpath, filesPath){
  var redis = new RedisPubSubClient(redisHost, redisPort, undefined);

    var server =  busNode.createHttpsNode(publicPort, keySpath, filesPath, redis);

    redis.subscribe(RELAY_PUBSUB_CHANNEL_NAME, function(envelope){
        busNode.pushMessage(keySpath, envelope.organisation, envelope.localChannel, envelope.message);
    })
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