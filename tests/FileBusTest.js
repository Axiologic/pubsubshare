var abhttps = require(".././lib/AutoBootHttps.js");

/*
eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJRMFZwVFRoa1pYbFZjV05rU1VFOVBRbz0iLCJrZXkiOiJXbGhOYW5KSmQwdGtlbHBxVTNjOVBRbz0ifQ==
*/

//eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJPVzFFTm5NM1VqZGhVWHBDYUVFOVBRbz0iLCJrZXkiOiJibFEyUmtGbWJsTnRlVGRpSzJjOVBRbz0ifQ==


var assert  = require ("semantc-firewall").assert;

var fs = require("fs");

var bus     = abhttps.busNode('localhost', 8080, 'serverKeys', server);
var client  = abhttps.busConnect("localhost", 8080, "clientKeys");


var DATA = "string for test";

var tmpFile = "temporaryFile";
var dnldFile = "temporaryDnldFile";

fs.unlinkSync(tmpFile);
fs.unlinkSync(dnldFile);

fs.writeFileSync(tmpFile, DATA);

assert.callback("Should receive a message from the bus", function(end){
    client.$upload("localhost:8080", tmpFile, function(err, uid){
        client.$download("localhost:8080", uid, dnldFile, function(err, done){
            var data = fs.readFileSync(dnldFile);
            assert.equal(data, DATA);
            end();
        });
    });
}





