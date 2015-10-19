var express = require("express");
var router = express.Router();
var submission = require("../models/submission.js");
var problem = require("../models/problem.js");
var settings = require("./settings.js");
var ensureAuthenticated = require("../middlewares/auth.js");
var moment = require("moment");

router.post("/api", function(req, res) {
    var sub = JSON.parse(req.body.data);
    if (req.body.secret !== settings.API_SECRET)
        res.status(401).send("Unauthorised");
    submission.update(sub)
    .then(function() {
        res.send("Success");
    })
    .fail(function(err) {
        res.send(err);
    });
});

router.get("/latest", function(req, res) {
    submission.all()
    .then(function(submissions) {
        res.render("submissions", {
	    user: req.user,
            title: "Latest Submissions",
            subtitle: "dunjudge.them",
            submissions: submissions
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

router.get("/mine", function(req, res) {
    submission.all()
    .then(function(submissions) {
        submissions = submissions.filter(function(e) {
            return e.user === req.user.username;
        });
        res.render("submissions", {
	    user: req.user,
            title: "My Submissions",
            subtitle: "dunjudge.them",
            submissions: submissions
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

router.get("/queue", function(req, res) {
    res.render("queue", {
        user: req.user,
        title: "Grading Queue",
        subtitle: "estimated waiting time: forevah"
    });
});

router.post("/submit/:problem", ensureAuthenticated, function(req, res) {
    if (!settings.LANGUAGES[req.body.language]) {
        req.session.error = "Invalid language";
        res.redirect(req.headers.referer || "/");
    } else
        submission.getID()
        .then(function(id) {
            problem.get(req.params.problem)
            .then(function(info) {
                var subtasks = [];
                info.subtasks.forEach(function(e, i, a) {
                    subtasks.push({
                        "num": i + 1,
                        "maxscore": a[i].score,
                        "score": 0
                    });
                });
                var obj = {
                    numid: id + 1, // Problem ID
                    title: req.params.problem, // Problem Title
                    user: req.user.username, // User name
                    code: req.body.code, // User code
                    score: 0, // Total Score
                    compile: "", // Time taken to compile / error message
                    submitted_date: moment().format(), // Submission
                    graded_date: moment(0).format(), // Grading
                    runtime: 0, // Max Time
                    contest: 0, // Contest
                    language: req.body.language, // Language
                    res: subtasks, // Subtasks
                    verdict: "failed", // Verdict
                    status: "Sending to server", // Update after compiling and judging
                    progress: "Grading", // Update after all subtasks
                    type: 1 // Need to change this
                };
                submission.add(obj)
                .then(function(obj) {
                    return submission.dispatch(obj);
                })
                .then(function(obj) {
                    res.redirect("/submissions/" + obj.numid);
                });
            });
        })
        .fail(function() {
            req.session.error = "An error was encountered";
            res.redirect(req.headers.referer || "/");
        });
});

router.get("/:id", function(req, res) {
    submission.get(parseInt(req.params.id))
    .then(function(sub) {
        problem.get(sub.title)
        .then(function(prob) {
            sub.verdict = sub.verdict.charAt(0).toUpperCase() + sub.verdict.slice(1); // Capitalize
            sub.language = settings.LANGUAGES[sub.language]; // Change language to be displayed
            sub.compile = atob(sub.compile);
            res.render("submission", {
                user: req.user,
                title: "<a href='/problems/" + sub.title + "'>" + sub.title + "</a>",
                subtitle: "#" + sub.numid + " by <a href='/users/" + sub.user + "'>" + sub.user + "</a>",
                submission: sub,
                isOwner: req.user && (req.user.username === sub.user),
                isViewable: req.user && (req.user.username === sub.user || ~ req.user.accepted.indexOf(sub.title)),
                problem: prob
            });
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

module.exports = router;