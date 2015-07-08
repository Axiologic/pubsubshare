var psc = require("../relay/relay.js");

var relay1 = psc.createRelay("ORG", "localhost", 6379, "localhost", 8001);
var client = psc.createClient( "localhost", 6379);


client.subscribe("test", function(obj){
    console.log(obj);
})


client.subscribe("local", function(obj){
    console.log(obj);
})

setTimeout(function(){
    client.publish("pubsub://ORG/test", {type:"testMessage"});
    client.publish("local", {type:"testLocalMessage"});
}, 1000)



