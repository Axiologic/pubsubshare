var abhttps = require(".././lib/AutoBootHttps.js");

/*
eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJRMFZwVFRoa1pYbFZjV05rU1VFOVBRbz0iLCJrZXkiOiJXbGhOYW5KSmQwdGtlbHBxVTNjOVBRbz0ifQ==
*/

//eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJPVzFFTm5NM1VqZGhVWHBDYUVFOVBRbz0iLCJrZXkiOiJibFEyUmtGbWJsTnRlVGRpSzJjOVBRbz0ifQ==




var assert      = require ("semantc-firewall").assert;
var fs          = require("fs");

var bus     = abhttps.busNode("localhost", 8080, "serverKeys", server);
var busClient   = abhttps.busConnect("localhost", 8080, "clientKey");


assert.callback("Should receive a message from the bus", function(end){
    bus.$subscribe(function(channel, msg){
        assert.equal(msg.msg, true);
        end();
    })
})


busClient.$publish("localhost:8080", "channel", {msg:true});




