var psc = require("../relay/relay.js");
var assert = require("semantic-firewall").assert;
var util = require("util");

var abhttps  = require("https-auto");


abhttps.cacheOrganisation("ORG1", {
    server:"localhost",
    port:8000
});


assert.begin("Testing basic pub/sub communication with a single node");

var relay1 = psc.createRelay("ORG1", "localhost", 6379, "localhost", 8000, "tmp2");
var client = psc.createClient( "localhost", 6379);


assert.callback("Should receive a message in local from redis", function(end){
    client.subscribe("local", function(res){
        assert.equal(res.type, "testLocalMessage");
        end();
    });

})


assert.callback("Should receive a message in test from the http server", function(end){
    client.subscribe("test",function(res){
        assert.equal(res.type, "testMessage");
        end();
    });
})


setTimeout(function(){
    client.publish("local", {type:"testLocalMessage"});
    client.publish("pubsub://ORG1/test", {type:"testMessage"});
}, 100);









