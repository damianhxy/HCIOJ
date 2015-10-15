var express = require("express");
var app = express();
var settings = require("./controllers/settings.js");
var session = require("./models/session.js");

require("./controllers/config.js")(app, express);
app.use(require("./controllers/routes.js"));

// Port
session.clear()
.then(function() {
    app.listen(settings.PORT, settings.IP);
    console.log("Listening on port " + settings.PORT + " @ " + settings.IP + " in " + app.get("env") + " mode.");
})
.fail(function() {
    console.log("Failed to clear sessions.");
    process.exit(1);
});