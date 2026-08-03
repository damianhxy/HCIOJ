"use strict";

require("dotenv").config();
const express = require("express");
const app = express();
const settings = require("./controllers/settings.js");
const session = require("./models/session.js");
const http = require("http");

require("./controllers/config.js")(app, express);
app.use(require("./controllers/routes.js"));

// Port
session
  .clear()
  .then(function () {
    const http_server = http.createServer(app).listen(settings.PORT, settings.IP);
    console.log(
      "HTTP Listening on port " +
        settings.PORT +
        " @ " +
        settings.IP +
        " in " +
        app.get("env") +
        " mode.",
    );
    app.io.attach(http_server);
  })
  .fail(function () {
    console.log("Failed to clear sessions.");
    process.exit(1);
  });
