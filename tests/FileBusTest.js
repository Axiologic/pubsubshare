var abhttps = require(".././lib/AutoBootHttps.js");

/*
eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJRMFZwVFRoa1pYbFZjV05rU1VFOVBRbz0iLCJrZXkiOiJXbGhOYW5KSmQwdGtlbHBxVTNjOVBRbz0ifQ==
*/

//eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJPVzFFTm5NM1VqZGhVWHBDYUVFOVBRbz0iLCJrZXkiOiJibFEyUmtGbWJsTnRlVGRpSzJjOVBRbz0ifQ==

var psc = require("../relay/relay.js");
var assert = require("semantic-firewall").assert;

assert.begin("Testing basic pub/sub communication between two organisations");


//organisationName, redisHost, redisPort, publicHost, publicPort, keySpath, filesPath
var relay1 = psc.createRelay("ORG1", "localhost", 6379, "localhost", 8000, "tmp", "tmpDownload");
var relay2 = psc.createRelay("ORG2", "localhost", 6380, "localhost", 8001, "tmp2", "tmp2Download");

var c1 = psc.createClient("localhost", 6379);
var c2 = psc.createClient("localhost", 6380);


assert.callback("File transfers works between organisations", function(end){
    c1.shareFile("tmp/testFile", function(err, transferId){
        fs.unlinkSync("tmp2/testFile")
        c2.pullFile(id, "tmp2/testFile", function(err, result){
            assert.equal(fs.readFileSync("tmp2/testFile"), "testFile");
            end();
        })
    });
})








