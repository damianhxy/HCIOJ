const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const { csrfSync } = require("csrf-sync");
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
    return require("dayjs")().format(settings.LOG_TIME_FORMAT);
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

  // Rate limiting on auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many authentication attempts, please try again later.",
    skip: function (req) {
      return req.method !== "POST"; // viewing the forms is not an attempt
    },
  });
  app.use("/signin", authLimiter);
  app.use("/signup", authLimiter);

  // CSRF protection
  const csrfProtection = csrfSync({
    getTokenFromRequest: function (req) {
      return (
        (req.body && req.body._csrf) ||
        (req.query && req.query._csrf) ||
        req.headers["x-csrf-token"]
      );
    },
  });
  app.use(function (req, res, next) {
    if (req.method === "POST" && req.path === "/submissions/api") {
      return next();
    }
    return csrfProtection.csrfSynchronisedProtection(req, res, next);
  });
  app.use(function (req, res, next) {
    res.locals.csrfToken = csrfProtection.generateToken(req);
    next();
  });

  // Strategies
  passport.use(
    "local-signin",
    new localStrategy({ passReqToCallback: true }, async function (req, username, password, done) {
      try {
        const found = await user.authenticate(username, password);
        console.info("Signed in " + found.username);
        req.session.success = "Welcome back, " + found.username;
        await session.add(found.username);
        done(null, found);
      } catch (err) {
        console.error(err.stack);
        req.session.error = err.message;
        done(null, false);
      }
    }),
  );

  passport.use(
    "local-signup",
    new localStrategy({ passReqToCallback: true }, async function (req, username, password, done) {
      try {
        const created = await user.create(req, username, password);
        console.info("Signed up " + created.username);
        req.session.success = "Welcome, " + created.username;
        await session.add(created.username);
        done(null, created);
      } catch (err) {
        console.error(err.stack);
        req.session.error = err.message;
        done(null, false);
      }
    }),
  );

  // Serialization
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(async function (id, done) {
    try {
      const found = await user.get(id);
      done(null, found);
    } catch (err) {
      done(err, false);
    }
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
