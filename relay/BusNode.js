
var abhttps  = require("https-auto");
var connect  = require("connect");
var connectRoute = require('connect-route');
var request = require("request");



exports.createHttpsNode = function(port, keysFolder, filesFolder, redis){

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
            console.log("Forwarding message towards", req.params.channel, req.params);
            redis.publish(req.params.channel, req.params);
            res.end('publish ');
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
            console.log("Posting towards", options.url, strMessage )
            request.post(options, strMessage );
            /*var post_req = http.request(post_options, function(res) {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    console.log('Response: ' + chunk);
                });
            });

            // post the data
            post_req.write(strMessage);
            post_req.end();
            */
        });



    })
}