
var socketio = require('socket.io');
var io = socketio();
var socket = new Object();

socket.attach = function(server)
{
	io.attach(server);
};
var submission = {
			"id":"1",
			"user":"dank",
			"problem":"memes",
			"time":"cant",
			"score":"melt",
			"progress":"steel beams",
			};

io.on('connection', function(socket){
	  console.log('socket connected');
	  socket.on('disconnect', function(){
		    console.log('socket disconnected');
	  });
	  
});

module.exports = socket;
  