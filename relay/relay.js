
var redis = require("redis");

function ns_getOrganisation(orgName){
    if(orgName == "ORG1"){
        return {
            server:"localhost",
            port:6379
        }
    } else {
        return {
            server:"localhost",
            port:7000
        }
    }
}

function pubSubChorClient(redisHost, redisPort, redisPassword){
    var subscribeRedisClient = redis.createClient(redisPort, redisHost);
    var publishRedisClient = redis.createClient(redisPort, redisHost);

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


exports.createRelay = function(organisationName, redisHost, redisPort, publicHost, publicPort, nsHost, nsPort){
  var client = pubSubChorClient(redisHost, redisPort);
}





exports.createClient = function(organisationName, redisHost, redisPort, redisPassword){
    var client = pubSubChorClient(redisHost, redisPort);
}