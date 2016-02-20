var express = require("express");
var router = express.Router();
var problem = require("../models/problem.js");
var submission = require("../models/submission.js");
var ensureAdmin = require("../middlewares/admin.js");

router.get("/", function(req, res) {
    problem.all()
    .then(function(problems) {
        res.render("problems", {
            user: req.user,
            title: "Problems",
            subtitle: "so many",
            problems: problems
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

/*
router.get("/add", ensureAdmin, function(req, res) {
    res.render("addproblem", {
        user: req.user,
        title: "Add a problem",
        subtitle: "for admins only"
    });
});

router.post("/add", ensureAdmin, function(req, res) {
    res.status(400).send("Not Implemented");
});
*/

router.get("/latest", function(req, res) {
    problem.all()
    .then(function(problems) {
        problems.sort(function(a, b) {
            if (a.added > b.added)
                return -1;
            return 1;
        });
        res.render("problems", {
            user: req.user,
            title: "Problems",
            subtitle: "sorted by added time",
            problems: problems
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

router.get("/search", function(req, res) {
    problem.all()
    .then(function(problems) {
        var tag = req.query.query.toLowerCase();
        problems = problems.filter(function(e) {
            if (~ e.title.indexOf(tag) || ~ e.subtitle.toLowerCase().indexOf(tag))
                return true;
            if (e.tags)
                return e.tags.some(function(f) {
                    return ~ f.toLowerCase().indexOf(tag);
                });
            return false;
        });
        res.render("problems", {
            user: req.user,
            title: "Problems",
            subtitle: "search results",
            problems: problems
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

router.get("/:problem", function(req, res) {
    problem.get(req.params.problem)
    .then(function(info) {
        submission.all()
        .then(function(submissions) {
            submissions = submissions.filter(function(e) {
                 return e.title === info.title;
            });
			submissions.sort(function(a,b){return b.numid-a.numid});
            var userSubmissions = submissions.filter(function(e) {
                return req.user && e.user === req.user.username;
            });
            res.render("problem", {
                user: req.user,
                problem: info,
                title: info.title,
                subtitle: info.subtitle,
                submissions: submissions,
                userSubmissions: userSubmissions,
                noCompileOptions: info.subtitle === "Output Only"
            });
        });
    })
    .fail(function(err) {
        console.log(err);
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

module.exports = router;