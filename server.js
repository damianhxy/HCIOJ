"use strict";

require("dotenv").config();
const express = require("express");
const app = express();
const settings = require("./controllers/settings.js");
const session = require("./models/session.js");
const http = require("http");

require("./controllers/config.js")(app, express);
app.use(require("./controllers/routes.js"));
app.use(function (err, req, res, _next) {
  console.error(err.stack);
  if (err.code === "EBADCSRFTOKEN") return res.status(403).send("Invalid CSRF token");
  const status = err.status || err.statusCode;
  if (status >= 400 && status < 500) return res.status(status).send(http.STATUS_CODES[status]);
  res.status(500).send("Internal Server Error");
});

async function start() {
  await session.clear();
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
}

start().catch(function () {
  console.log("Failed to clear sessions.");
  process.exit(1);
});
