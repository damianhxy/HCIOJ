var express = require("express");
var router = express.Router();
var ensureAdmin = require("../middlewares/admin.js");
var problem = require("../models/problem.js");
var contest = require("../models/contest.js");

router.use(ensureAdmin);

router.get("/", function(req, res) {
    var scope = {};
    res.render("admin", {
    	user: req.user,
    	title: "Admin Panel",
    	subtitle: "hurr"
    });
});

// Edit Users

router.get("/users", function(req, res) {
    var scope = {};
    res.render("edituser", {
    	user: req.user,
    	title: "Editing Users",
    	subtitle: "Admin"
    });
});

// Edit Problems

router.get("/problems", function(req, res) {
    var scope = {};
    res.render("editproblem", {
    	user: req.user,
    	title: "Editing Problems",
    	subtitle: "Admin"
    });
});

// Edit Contests

router.get("/contests", function(req, res) {
    var scope = {};
    problem.all()
    .then(function(problems) {
        res.render("editcontest", {
        	user: req.user,
        	title: "Editing Contests",
        	subtitle: "Admin",
        	problems: problems
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

router.get("/contests/new", function(req, res) {
    var scope = {};
    problem.all()
    .then(function(problems) {
        res.render("editcontest", {
        	user: req.user,
        	title: "Editing Contests",
        	subtitle: "Admin",
        	problems: problems,
        	submit: "/admin/addcontest"
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

router.get("/contests/:id", function(req, res) {
    var scope = {};
    contest.get(req.params.id)
    .then(function(cont){
        scope.cont = cont;
        return problem.all();
    })
    .then(function(problems) {
        res.render("editcontest", {
        	user: req.user,
        	title: "Editing Contests",
        	subtitle: "Admin",
        	problems: problems,
        	contest: scope.cont,
        	submit: "/admin/editcontest"
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
    });
});

router.post("/addcontest", function(req, res) {
    contest.getID()
	.then(function(numid) {
		return contest.add({
			id: numid.toString(),
			title: req.body.title,
			desc: req.body.desc,
			start: req.body.start,
			end: req.body.end,
			indi: req.body.indi === "on",
			time: parseInt(req.body.time),
			problems: req.body.problems.split(","),
			hidden: req.body.hidden === "on",
			url: "/contests/" + numid
		});
	})
	.then(function() {
		req.session.success = "Contest Added Successfully";
		res.redirect("/admin/contests");
	})
	.fail(function() {
		req.session.error = "An error was encountered while processing your request";
		res.redirect("/admin/contests");
	});
});

router.post("/editcontest", function(req, res) {
    contest.get(req.body.id)
	.then(function(cont) {
		return contest.edit(cont.id, {
			title: req.body.title,
			desc: req.body.desc,
			start: req.body.start,
			end: req.body.end,
			indi: req.body.indi === "on",
			time: parseFloat(req.body.time),
			problems: req.body.problems.split(","),
			hidden: req.body.hidden === "on"
		});
	})
	.then(function() {
		req.session.success = "Contest Edited Successfully";
		res.redirect("/admin/contests");
	})
	.fail(function() {
		req.session.error = "An error was encountered while processing your request";
		res.redirect("/admin/contests");
	});
});

module.exports = router;