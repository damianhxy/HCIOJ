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

var socketio = require('socket.io');


require("./controllers/config.js")(app, express);
app.use(require("./controllers/routes.js"));

// Port
session.clear()
.then(function() {
    var http_server = http.createServer(app).listen(settings.PORT);
    console.log("HTTP Listening on port " + settings.PORT + " @ " + settings.IP + " in " + app.get("env") + " mode.");
    var https_server = https.createServer(https_options, app).listen(8443, settings.IP);
    console.log("HTTPS Listening on port " + 8443 + " @ " + settings.IP + " in " + app.get("env") + " mode.");
    
    var io = socketio(http_server);
    io.on('connection', function(socket){
    	  console.log('socket connected');
    	  socket.on('disconnect', function(){
    		    console.log('socket disconnected');
    	  });
    	  socket.on('message', function(msg){
    		  console.log('client sent: '+ msg);
    		  io.emit('message', 'dank server test');
    	  });
    	  var submission = {
    			  			"id":"1",
    			  			"user":"dank",
    			  			"problem":"memes",
    			  			"time":"cant",
    			  			"score":"melt",
    			  			"progress":"steel beams",
    			  			};
    	  
		  io.emit('new submission',submission);
    });
})
.fail(function() {
    console.log("Failed to clear sessions.");
    process.exit(1);
});