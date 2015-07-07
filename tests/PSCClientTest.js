var psc = require("pubsubchor");

var relay1 = psc.createRelay("organisation1", "localhost", 9000, "localhost", 10000);
var relay2 = psc.createRelay("organisation2", "localhost", 9001, "localhost", 10000);

var c1 = psc.createClient("organisation1", "localhost", 6379);
var c2 = psc.createClient("organisation2", "localhost", 7000);
var assert = require("semantic-firewall").assert;


assert.callback("Subscribe works", function(end){
    c1.subscribe("testChannel", function(msg){
        assert.equal(msg.message, "message");
        end();
    });
})

c2.publish("pubsub://organisation1/testChannel", {message:"message"});


