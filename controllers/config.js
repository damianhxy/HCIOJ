const bodyParser = require("body-parser");
const user = require("../models/user.js");
const session = require("../models/session.js");
const morgan = require("morgan");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const settings = require("./settings.js");
const expressSession = require("express-session");
const exphbs = require("express-handlebars");
const localStrategy = require("passport-local");
const compression = require("compression");
const io = require("socket.io")();

module.exports = function (app, express) {
  const hbs = exphbs.create({
    defaultLayout: "main",
    helpers: {
      scoreColour: require("../helpers/scoreColour.js"),
      getContest: require("../helpers/getContest.js"),
      score: require("../helpers/score.js"),
      contestScore: require("../helpers/contestScore.js"),
      getStat: require("../helpers/getStat.js"),
      generateOnline: require("../helpers/generateOnline.js"),
      json: require("../helpers/json.js"),
      inc: require("../helpers/inc.js"),
    },
  });

  app.use(compression());
  app.use(express.static("public"));

  require("console-stamp")(console);

  morgan.token("time", function () {
    return require("moment")().format(settings.LOG_TIME_FORMAT);
  });
  app.use(
    morgan("[:time] :method :url :status :res[content-length] - :remote-addr - :response-time ms"),
  );

  // Middleware
  app.use(cookieParser(settings.SECRET));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  const expresssession = expressSession({
    secret: settings.SECRET,
    saveUninitialized: true,
    resave: true,
  });
  app.use(expresssession);
  app.use(passport.initialize());
  app.use(passport.session());

  // Strategies
  passport.use(
    "local-signin",
    new localStrategy({ passReqToCallback: true }, function (req, username, password, done) {
      return user
        .authenticate(username, password)
        .then(function (user) {
          console.info("Signed in " + user.username);
          req.session.success = "Welcome back, " + user.username;
          session.add(user.username).then(function () {
            done(null, user);
          });
        })
        .fail(function (err) {
          console.error(err.stack);
          req.session.error = err.message;
          done(null, false);
        });
    }),
  );

  passport.use(
    "local-signup",
    new localStrategy({ passReqToCallback: true }, function (req, username, password, done) {
      return user
        .create(req, username, password)
        .then(function (user) {
          console.info("Signed up " + user.username);
          req.session.success = "Welcome, " + user.username;
          session.add(user.username).then(function () {
            done(null, user);
          });
        })
        .fail(function (err) {
          console.error(err.stack);
          req.session.error = err.message;
          done(null, false);
        });
    }),
  );

  // Serialization
  passport.serializeUser(function (user, done) {
    done(null, user._id);
  });

  passport.deserializeUser(function (id, done) {
    user
      .get(id)
      .then(function (user) {
        done(null, user);
      })
      .fail(function (err) {
        done(err, false);
      });
  });

  // Settings
  app.enable("case sensitive routing");
  app.enable("strict routing");
  app.disable("x-powered-by");
  app.engine("handlebars", hbs.engine);
  app.set("view engine", "handlebars");

  io.use(function (socket, next) {
    // Wrap the express middleware
    expresssession(socket.request, {}, next);
  });
  const pinit = passport.initialize();
  io.use(function (socket, next) {
    pinit(socket.request, {}, next);
  });
  const psess = passport.session();
  io.use(function (socket, next) {
    psess(socket.request, {}, next);
  });

  io.on("connection", function (socket) {
    let user;
    if (socket.request.isAuthenticated()) {
      user = socket.request.user.username;
      socket.join("authed");
    } else user = "none";
    console.log("socket connected id: " + socket.id + " user: " + user);
    socket.on("disconnect", function () {
      console.log("socket disconnected");
    });
  });

  app.io = io;
  global.io = io;
};
