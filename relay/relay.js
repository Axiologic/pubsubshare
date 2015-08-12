
var redis = require("redis");
var request = require("request");
var uuid = require('node-uuid');

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


function NotReadyAPI(realCallback, setter){
    var pendingCommands = [];
    var self = this;
    function fakeCallback(){
        var args = [];
        for(var i= 0,len= arguments.length; i<len;i++){
            args.push(arguments[i]);
        }
        pendingCommands.push(args);
    }


    this.activate = function(){
        setter(realCallback);
        pendingCommands.forEach(function(args){
            realCallback.apply(self, args);
        })
        pendingCommands = [];
    }

    setter(fakeCallback);

}


exports.createClient = function(redisHost, redisPort, redisPassword, keysFolder){
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



    function copyFile(source, target, callback) {
            function reject(err){
                callback(err)
            }
            var rd = fs.createReadStream(source);
            rd.on('error', reject);
            var wr = fs.createWriteStream(target);
            wr.on('error', reject);
            wr.on('finish', callback);
            rd.pipe(wr);
    }

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

    function shareFile(filePath, callback){
        var uid = new Buffer(JSON.stringify({organisation:organisationName, random:uuid.v4()})).toString('base64');
        busNode.upload(keysFolder, organisationName, uid, filePath, function(err, res){
            callback(err, uid);
        });
    }

    function download(transferId, path, callback){
        var js = JSON.parse(new Buffer(transferId, 'base64').toString('ascii'));
        busNode.download(keysFolder, transferId, js.organisation,  path, callback);
    }

    var shareFileApi    =  new NotReadyAPI(shareFile,function(callback){
        client.shareFile = callback;
    })

    var downloadFileApi = new NotReadyAPI(download,function(callback){
        client.download = callback;
    })


    function tryToGetConfiguration(){
        if(!publicFSHost){
            console.log("...Trying:", redisHost, redisPort);
            setTimeout(tryToGetConfiguration,300);
        } else {
            shareFileApi.activate();
            downloadFileApi.activate();
        }
    }

    tryToGetConfiguration();

    return client;
}