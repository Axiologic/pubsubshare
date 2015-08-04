
var abhttps  = require("https-auto");
var connect  = require("connect");
var connectRoute = require('connect-route');
var request = require("request");



exports.createHttpsNode = function(port, keysFolder, filesFolder, redis){


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


    app.use(connectRoute(function (router) {
        router.get('/', function (req, res, next) {
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


    //abhttps.startMutualAuthServer(port, keysFolder, app);
    abhttps.startServer(port, keysFolder, app);
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

exports.pushMessage  = function(keysFolder, organisation, channel, strMessage){
    if(!keysFolder){
        keysFolder = "tmp";
    }


    ns_getOrganisation( organisation, function(err, org){

        abhttps.getHttpsOptions("tmp", function(err, options){
            options = {};
            options.rejectUnauthorized = false;
            options.requestCert        = true;
            options.agent              = false;

            options.hostname = org.server;
            options.port = org.port;
            options.url = "https://" + org.server + ":" + org.port + "/publish/" + channel;
            options.form = strMessage ;
            request.post(options);
        });



    })
}