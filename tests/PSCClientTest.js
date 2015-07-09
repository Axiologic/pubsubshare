var psc = require("../relay/relay.js");
var assert = require("semantic-firewall").assert;

var relay1 = psc.createRelay("ORG1", "localhost", 6379, "localhost", 8000);
var relay2 = psc.createRelay("ORG2", "localhost", 6380, "localhost", 8001);

var c1 = psc.createClient("localhost", 6379);
var c2 = psc.createClient("localhost", 6380);


assert.callback("Communication works between organisations", function(end){
    c1.subscribe("testChannel", function(msg){
        assert.equal(msg.message, "message");
        end();
    });
})

c2.publish("pubsub://ORG1/testChannel", {message:"message"});


