#!/usr/bin/node
var express = require("express");
var app = express();
var settings = require("./controllers/settings.js");
var session = require("./models/session.js");
var fs = require('fs');
var http = require('http');
var https = require('https');
var sslkey = fs.readFileSync('./ssl/ojdev.key');
var sslcert = fs.readFileSync('./ssl/ojdev.crt');
var https_options = {
	    key: sslkey,
	    cert: sslcert
};


require("./controllers/config.js")(app, express);
app.use(require("./controllers/routes.js"));

// Port
session.clear()
.then(function() {
    var http_server = http.createServer(app).listen(settings.PORT);
    console.log("HTTP Listening on port " + settings.PORT + " @ " + settings.IP + " in " + app.get("env") + " mode.");
    var https_server = https.createServer(https_options, app).listen(8443, settings.IP);
    console.log("HTTPS Listening on port " + 8443 + " @ " + settings.IP + " in " + app.get("env") + " mode.");
    
    app.io.attach(http_server);
    app.io.attach(https_server);
   
})
.fail(function() {
    console.log("Failed to clear sessions.");
    process.exit(1);
});
