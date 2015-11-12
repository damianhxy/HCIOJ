var bodyParser = require("body-parser");
var user = require("../models/user.js");
var session = require("../models/session.js");
var morgan = require("morgan");
var passport = require("passport");
var cookieParser = require("cookie-parser");
var settings = require("./settings.js");
var expressSession = require("express-session");
var exphbs = require("express-handlebars");
var localStrategy = require("passport-local");
var compression = require("compression");

module.exports = function(app, express) {
    var hbs = exphbs.create({
        defaultLayout: "main",
        helpers: {
            scoreColour: require("../helpers/scoreColour.js"),
            getContest: require("../helpers/getContest.js"),
            score: require("../helpers/score.js"),
            contestScore: require("../helpers/contestScore.js"),
			get: require("../helpers/get.js"),
            getStat: require("../helpers/getStat.js"),
            generateOnline: require("../helpers/generateOnline.js"),
            json: require("../helpers/json.js"),
            inc: require("../helpers/inc.js")
        }
    });
    
    app.use(compression());
    app.use(express.static("public"));

    require("console-stamp")(console, {
        pattern: settings.TIME_FORMAT,
        colors: {
            stamp: "cyan",
            label: "magenta"
        }
    });
    
    morgan.token("time", function() {
        return require("dateformat")(new Date(), settings.LOG_TIME_FORMAT);
    });
    app.use(morgan("[:time] :method :url :status :res[content-length] - :remote-addr - :response-time ms"));

    // Middleware
    app.use(cookieParser(settings.SECRET));
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(expressSession({
        secret: settings.SECRET,
        saveUninitialized: true,
        resave: true
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    // Strategies
    passport.use("local-signin", new localStrategy(
        { passReqToCallback: true },
        function(req, username, password, done) {
            return user.authenticate(username, password)
            .then(function(user) {
                console.info("Signed in " + user.username);
                req.session.success = "Welcome back, " + user.username;
                session.add(user.username)
                .then(function() {
                    done(null, user);
                });
            })
            .fail(function(err) {
                console.error(err.stack);
                req.session.error = err.message;
                done(null, false);
            });
        }
    ));

    passport.use("local-signup", new localStrategy(
        { passReqToCallback: true },
        function(req, username, password, done) {
            return user.create(req, username, password)
            .then(function(user) {
                console.info("Signed up " + user.username);
                req.session.success = "Welcome, " + user.username;
                done(null, user);
            })
            .fail(function(err) {
                console.error(err.stack);
                req.session.error = err.message;
                done(null, false);
            });
        }
    ));

    // Serialization
    passport.serializeUser(function(user, done) {
        done(null, user._id);
    });

    passport.deserializeUser(function(id, done) {
        user.get(id)
        .then(function(user) {
            done(null, user);
        })
        .fail(function(err) {
            done(err, false);
        });
    });

    // Settings
    app.enable("case sensitive routing");
    app.enable("strict routing");
    app.disable("x-powered-by");
    app.engine("handlebars", hbs.engine);
    app.set("view engine", "handlebars");
};