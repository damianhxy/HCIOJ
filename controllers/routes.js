var express = require("express");
var router = express.Router();
var ensureAuthenticated = require("../middlewares/auth.js");
var notification = require("../middlewares/notifications.js");
var contest = require("../models/contest.js");
var submission = require("../models/submission.js");
var user = require("../models/user.js");
var passport = require("passport");
var session = require("../models/session.js");
var io = global.io;

router.use(notification);

/* Submissions */
router.use("/submissions", require("./submissions.js"));

/* Problems */
router.use("/problems", require("./problems.js"));

/* Users */
router.use("/users", require("./users.js"));

/* Clarifications */
router.use("/clarifications", require("./clarifications.js"));

/* Contests */
router.use("/contests", require("./contests.js"));

/* Admin */
router.use("/admin", require("./admin.js"));

router.get("/", function(req, res, next) {
    if (req.user)
		contest.all()
		.then(function(contests) {
			submission.all()
            .then(function(submissions) {
                session.all()
                .then(function(users) {
                    submissions = submissions || []; // [] turns into undefined
                    var userSubmissions = submissions.filter(function(e) {
                        return e.user === req.user.username;
                    });
                    var submissions = submissions.slice(0, 10);
                    submissions.
                    res.render("homepage", {
                        user: req.user,
                        title: "Home",
                        subtitle: "an overview",
                        events: JSON.stringify(contests),
                        submissions: submissions,
                        userSubmissions: userSubmissions,
                        onlineUsers: users
                    });
                });
            });
		})
		.fail(function(err) {
			next(err);
		});
	else
    	res.render("landing");
});

router.get("/logout", ensureAuthenticated, function(req, res) {
    session.remove(req.user.username)
    .then(function() {
        console.log("Logged " + req.user.username + " out");
        req.logout();
        res.redirect("/");
    })
    .fail(function() {
        console.log("Failed to log " + req.user.username + " out");
        req.session.error = "An error was encountered while processing your request";
        res.redirect(req.headers.referer || "/");
    });
});


// For testing handlebars pages
router.get("/test", function(req, res){
    // io.emit();
    res.render("404", {
        user: req.user,
        title: "Hey",
        subtitle: "an overview"
    })
});


router.get("/signin", function(req, res) {
    if (req.user) {
        req.session.warning = "You are already signed in";
        res.redirect(req.headers.referer || "/");
    }
    else res.render("signin", { layout: false });
});

router.post("/signin", passport.authenticate("local-signin", {
    successRedirect: "/",
    failureRedirect: "/signin"
}));

router.get("/signup", function(req, res) {
    if (req.user) {
        req.session.warning = "You are already signed in";
        res.redirect(req.headers.referer || "/");
    }
    else res.render("signup", { layout: false });
});

router.post("/signup", passport.authenticate("local-signup", {
    successRedirect: "/",
    failureRedirect: "/signup"
}));

/* 404 & 500 */
router.use(function(req, res) {
    res.status(404).render("404", {
        user: req.user,
        title: "Page Not Found"
    });
});

router.use(function(err, req, res) {
    console.error(err.stack);
    res.status(500).send("Internal Server Error");
});

module.exports = router;