
var redis = require("redis");
var request = require("request");
var uuid = require('node-uuid');

var RELAY_PUBSUB_CHANNEL_NAME = "PubSubRelay";

var CONFIGURATION_REQUEST_CHANNEL_NAME = "PubSub_CONFIGURATION_CHANNEL_REQUEST";
var CONFIGURATION_ANSWEAR_CHANNEL_NAME = "PubSub_CONFIGURATION_CHANNEL_ANSWEAR";

var container = require("semantic-firewall").container;

/*
    TODO: review error handling code! Still not cool enough...
*/

function RedisPubSubClient(redisPort, redisHost , redisPassword, statusReporting){

    console.log("Connecting to:", redisPort, redisHost);
    var cmdRedisClient = null;
    var subscribeRedisClient = redis.createClient(redisPort, redisHost, redisPassword);

    subscribeRedisClient.retry_delay = 1000;
    subscribeRedisClient.max_attempts = 100;
    subscribeRedisClient.on("error", onRedisReconnecting);

    subscribeRedisClient.on("ready", function(){
            cmdRedisClient = redis.createClient(redisPort, redisHost, redisPassword);
            cmdRedisClient.retry_delay = 2000;
            cmdRedisClient.max_attempts = 20;
            cmdRedisClient.on("error", onRedisReconnecting);
            cmdRedisClient.on("reconnecting", onRedisReconnecting);
            cmdRedisClient.on("ready",onRedisReconnecting);
        });

     function onRedisReconnecting(err, res) {
         //cprint("Redis reconnecting attempt [" + event.attempt + "] with delay [" + event.delay + "] !");
         if(!err){
             if(cmdRedisClient.retry_delay < 30000){
                 cmdRedisClient.retry_delay += 1000;
             }
         }
         statusReporting(err, cmdRedisClient);
         //localLog("redis", "Redis reconnecting attempt [" + event.attempt + "] with delay [" + event.delay + "] !", event);
     }

    var listeners = {};


    this.subscribe = function(channel, callback){
        listeners[channel] =  callback;
        subscribeRedisClient.subscribe(channel);
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
            if(!obj){
                throw new Error("Wrong message from " + channel);
            }
            c(obj, channel);
        }
    })

    this.publish = function(channel, message, callback){
        cmdRedisClient.publish(channel, message, callback);
    }

    this.getCmdConnection = function(){
        return cmdRedisClient;
    }
}


var busNode = require("./BusNode.js");

exports.createRelay = function(organisationName, redisHost, redisPort, redisPassword, publicHost, publicPort, keySpath, filesPath, statusReporting){
  var redis = new RedisPubSubClient(redisPort, redisHost, redisPassword, statusReporting);


    var server =  busNode.createHttpsNode(publicPort, keySpath, filesPath, redis);

    redis.subscribe(RELAY_PUBSUB_CHANNEL_NAME, function(envelope){
        busNode.pushMessage(keySpath, envelope.organisation, envelope.localChannel, envelope.message);
    })

    redis.subscribe(CONFIGURATION_REQUEST_CHANNEL_NAME, function(){
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

/*
 statusReporting will be called with errors or with a valid redis connection that can be used to send Redis Commands

 */

exports.createClient = function(redisHost, redisPort, redisPassword, keysFolder, statusReporting){

    var client = new RedisPubSubClient(redisHost, redisPort, redisPassword,  function(err, cmdConnection){
        if(!err){
            client.publish(CONFIGURATION_REQUEST_CHANNEL_NAME, JSON.stringify({ask:"config"}));
            client.subscribe(CONFIGURATION_ANSWEAR_CHANNEL_NAME, function(obj){
                //WELL.. check also what happens after mny reconnects...
                publicFSHost = obj.publicHost;
                publicFSPort = obj.publicPort;
                if(organisationName != obj.organisationName) {
                    organisationName = obj.organisationName;
                    console.log("Current organisation is: ", organisationName );
                }

            })
        }
        if(!err && cmdConnection == null) throw(new Error("cmdConnection Should not be null!"));
        statusReporting(err, cmdConnection);
    });

    var oldPublish = client.publish;
    var publicFSHost;
    var publicFSPort;
    var organisationName;

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
            console.log("Requesting current organisation name from:", redisHost, redisPort);
            setTimeout(tryToGetConfiguration,300);
        } else {
            shareFileApi.activate();
            downloadFileApi.activate();
        }
    }

    tryToGetConfiguration();

    return client;
}