var express = require("express");
var router = express.Router();
var clarification = require("../models/clarification.js");
var problem = require("../models/problem.js");

router.get("/", function(req, res) {
    problem.all()
    .then(function(problems) {
        clarification.all()
        .then(function(clarifications) {
            res.render("clarifications", {
                user: req.user,
                title: "Clarifications",
                subtitle: "speak now or forever hold your peace",
                problems: problems,
                clarifications: clarifications
            });
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered while processing your request";
        res.redirect(req.headers.referer || "/");
    });
});

router.post("/", function(req, res) {
    clarification.add({
        "problem": req.body.problem,
    	"author": req.user.username,
    	"query": req.body.query
    })
    .then(function() {
        res.redirect("/clarifications");
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
        res.redirect("/clarifications");
    })
});

module.exports = router;