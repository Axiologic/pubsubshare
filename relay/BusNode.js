
var abhttps  = require("https-auto");
var https  = require("https");
var connect  = require("connect");
var connectRoute = require('connect-route');
var request = require("request");
var clientCertificateAuth = require('client-certificate-auth');



exports.createHttpsNode = function(port, keysFolder, filesFolder, redis){

    var checkAuth = function(cert) {
        /*
         * allow access if certificate subject Common Name is 'Doug Prishpreed'.
         * this is one of many ways you can authorize only certain authenticated
         * certificate-holders; you might instead choose to check the certificate
         * fingerprint, or apply some sort of role-based security based on e.g. the OU
         * field of the certificate. You can also link into another layer of
         * auth or session middleware here; for instance, you might pass the subject CN
         * as a username to log the user in to your underlying authentication/session
         * management layer.
         */
        console.log("Checking");
        return true;
        //return cert.subject.CN === 'Doug Prishpreed';
    };

    function retriveContent(req, callback){
        var bodyStr = "";
        req.on("data",function(chunk){
            bodyStr += chunk.toString();
        });
        req.on("end",function(){
            callback(null, bodyStr);
        });
    }


    if(!keysFolder){
        keysFolder = "tmp";
    }

    if(!filesFolder){
        filesFolder = "uploads";
    }
    var app = connect();

    // gzip/deflate outgoing responses
    /*var compression = require('compression');
    app.use(compression());*/


    app.use(function(req,res, next){
        var cert = req.connection.getPeerCertificate();
        console.log("Hit request", cert);
        next();
    });

    //app.use(clientCertificateAuth(checkAuth));

    app.use(connectRoute(function (router) {
        router.get('/', function (req, res, next) {
            console.log("Index hit");
            res.end('index');
        });


        router.post('/publish/:channel', function (req, res, next) {
            retriveContent(req, function(err, result){
                redis.publish(req.params.channel, result);
                res.end('publish ');
            });

        });

        router.get('/upload/:transferId', function (req, res, next) {
            console.log("Forwarding message towards", req.params.channel, req.body);
            redis.publish(req.params.channel, req.body);
            res.end('upload ' );
        });

        router.get('/download/:transferId', function (req, res, next) {
            console.log("Downloading message ", req.params.channel, req.body);

            res.end('download');
        });


    }));


    abhttps.startMutualAuthServer(port, keysFolder, app);
    //abhttps.startServer(port, keysFolder, app);
    return app;
}


function ns_getOrganisation(orgName, callback){
    if(orgName == "ORG1"){
        callback(null, {
            server:"localhost",
            port:8000
        });
    } else {
        callback(null, {
            server:"localhost",
            port:8001
        });
    }
}

function doPost(options, result){
    var buf = new Buffer(options.form);
    options.headers =  {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'en-US,en;q=0.5',
            'User-Agent': 'PubSub Choreography 1.0',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': buf.length
    }

    var req = https.request(options, function(res) {

    res.on('data', function(d) {
                if(result){
                    result(null, d);
                }
            //process.stdout.write(d);
        });

    });


    req.write(buf);
    req.end();

    req.on('error', function(e) {
        console.error(e);
    })

}

exports.pushMessage  = function(keysFolder, organisation, channel, strMessage){

    ns_getOrganisation( organisation, function(err, org){

        abhttps.getHttpsOptions(keysFolder, function(err, options){
            //options = {};
            options.rejectUnauthorized = false;
            options.requestCert        = true;
            options.agent              = false;

            options.hostname = org.server;
            options.port = org.port;
            options.url = "https://" + org.server + ":" + org.port + "/publish/" + channel;
            options.path = "/publish/" + channel;
            options.form = strMessage ;
            options.method = 'POST';
            //console.log(options);
            doPost(options);
            //request.post(options);

        });



    })
}