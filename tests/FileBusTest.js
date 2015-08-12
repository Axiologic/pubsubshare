/*
eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJRMFZwVFRoa1pYbFZjV05rU1VFOVBRbz0iLCJrZXkiOiJXbGhOYW5KSmQwdGtlbHBxVTNjOVBRbz0ifQ==
*/

//eyJ1cmwiOiJsb2NhbGhvc3Q6MzAwMCIsImNvZGUiOiJPVzFFTm5NM1VqZGhVWHBDYUVFOVBRbz0iLCJrZXkiOiJibFEyUmtGbWJsTnRlVGRpSzJjOVBRbz0ifQ==

var psc = require("../relay/relay.js");
var assert = require("semantic-firewall").assert;
var fs = require("fs");

assert.begin("Testing basic pub/sub communication between two organisations");


//organisationName, redisHost, redisPort, publicHost, publicPort, keySpath, filesPath
var relay1 = psc.createRelay("ORG1", "localhost", 6379, "localhost", 8000, "tmp", "tmpDownload");


var c1 = psc.createClient("localhost", 6379, undefined, "tmp");


assert.callback("File transfers works between organisations", function(end){
    c1.shareFile("tmp/testFile", function(err, transferId){
        try{
            fs.unlinkSync("tmp2/testFile_dnld")
        } catch(err){

        }
        if(!err){
            c1.download(transferId, "tmp2/testFile_dnld", function(err, result){
                var content = fs.readFileSync("tmp2/testFile_dnld");
                assert.equal(content, "[[[testFile content]]]");
                end();
            })
        }
    });
})








