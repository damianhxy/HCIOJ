var express = require("express");
var router = express.Router();
var ensureAdmin = require("../middlewares/admin.js");
var ensureAuthenticated = require("../middlewares/auth.js");
var problem = require("../models/problem.js");
var contest = require("../models/contest.js");
var clarification = require("../models/clarification.js");
var submission = require("../models/submission.js");
var moment = require("moment");
var settings = require("./settings.js");
var entry = require("../models/entry.js");

router.get("/", ensureAuthenticated, function(req, res) {
	contest.all()
		.then(function(contests) {
			res.render("contests", {
				user: req.user,
				title: "Contests",
				subtitle: "all the upcoming contests",
				events: JSON.stringify(contests)
			});
		})
		.fail(function() {
			req.session.error = "An error was encountered while processing your request";
			res.redirect("/");
		});
});
/*
router.get("/add", ensureAdmin, function(req, res) {
	problem.all()
		.then(function(prob) {
			res.render("addcontest", {
				user: req.user,
				title: "Create Contest",
				subtitle: "Make a new contest",
				probs: prob
			});
		})
		.fail(function() {
			req.session.error = "An error was encountered while processing your request";
			res.redirect("/");
		});
});

router.post("/add", ensureAdmin, function(req, res) {
	contest.getID()
		.then(function(numid) {
			return contest.add({
				id: numid.toString(),
				title: req.body.title,
				desc: req.body.desc,
				start: req.body.start,
				end: req.body.end,
				indi: req.body.indi === "on",
				time: parseFloat(req.body.time),
				problems: req.body.problems.split(","),
				url: "/contest/" + numid
			});
		})
		.then(function() {
			req.session.success = "Contest Added Successfully";
			res.redirect("/add");
		})
		.fail(function() {
			req.session.error = "An error was encountered while processing your request";
			res.redirect("/add");
		});
});
*/
router.get("/:id", ensureAuthenticated, function(req, res) {
	var scope = {};
	contest.get(req.params.id)
		.then(function(cont) { // Check that contest exists
			scope.contest = cont;
			return entry.get({
				username: req.user.username,
				contest: req.params.id
			});
		})
		.then(function(ent) {
			if (ent) { // If entry exists
				return entry.get({
					username: req.user.username,
					contest: req.params.id
				});
			}
			else { // Should add check for time
				scope.entry = ent;
				throw new Error("noentry");
				/*return entry.add({
					username: req.user.username,
					contest: req.params.id,
					start: moment().format(),
					end: moment().add(scope.contest.time,'m').format(),
					total: "0"
				})*/
			}
		})
		.then(function(ent) {
			scope.entry = ent;
			return problem.getProblems(scope.contest.problems);
		})
		.then(function(prob) {
			scope.contest.end = moment(scope.contest.end).format();
			res.render("contest", {
				user: req.user,
				title: scope.contest.title,
				subtitle: scope.entry.end,
				entry: scope.entry,
				contest: scope.contest,
				problems: prob
			});
		})
		.fail(function(err) {
			console.log(scope);
			if(err.message == "noentry"){
				console.log("DNAK");
				res.render("joincontest", {
					user: req.user,
					title: scope.contest.title,
					subtitle: "contest",
					contest: scope.contest
				});
			}
			else{
				req.session.error = "An error was encountered while processing your request";
				res.redirect("/contests");
			}
		})
		// contest.get(req.params.id)
		// .then(function(contest) { //check that contest exists
		//     scope.contest = contest;
		//     return contmgr.checkEntry({
		//         user: req.user.username,
		//         numid: req.params.id
		//     });
		// })
		// .then(function(entry) { //if contest entry exists
		//     scope.entry = entry;
		//     return problem.getProblems(scope.contest.problems);
		// })
		// .then(function(prob) {
		//     res.render("problems", {
		//         user: req.user,
		//         title: scope.contest.title,
		//         subtitle: scope.entry.endtime,
		//         problems: prob
		//     });
		// })
		// .fail(function(err) {
		//     if (err === "NO_SUCH_ENTRY") {
		//         var time = Date.now(), endt = scope.contest.end;
		//         if (scope.contest.indi) endt = time.add(scope.contest.time, "h");
		//             var entry = {
		//                 username: req.user.username,
		//                 contest: scope.contest.id
		//                 numid: req.params.id,
		//                 starttime: time,
		//                 endtime: endt
		//             };
		//             if (time.isAfter(scope.contest.start) && time.isBefore(scope.contest.end)) { //if not entered
		//                 entry.add(entry)
		//                 .then(function(entry) {
		//                     scope.entry = entry;
		//                     req.session.success = "Entered contest " + scope.contest.title;
		//                     return problem.getProblems(scope.contest.problems);
		//                 })
		//                 .then(function(prob) {
		//                     res.render("problems", {
		//                         user: req.user,
		//                         title: scope.contest.title,
		//                         subtitle: scope.entry.endtime,
		//                         problems: prob
		//                     });
		//                 })
		//                 .fail(function() {
		//                     //add error checking
		//                     req.session.error = "Could not enter contest";
		//                     res.redirect("/contests");
		//                 });
		//             }
		//             else {
		//                 problem.getProblems(scope.contest.problems)
		//                 .then(function (prob) {
		//                     req.session.error = "Contest has ended";
		//                     res.render("problems", {
		//                         user: req.user,
		//                         title: scope.contest.title,
		//                         subtitle: "contest ended",
		//                         problems: prob
		//                     });
		//                 })
		//                 .fail(function() {
		//                     req.session.error = "Could not load problems";
		//                     res.redirect("/contests");
		//                 });
		//             }
		//         } else {
		//             req.session.error = "An error was encountered while processing your request";
		//             res.redirect("/contests");
		//         }
		// });
});

router.post("/:id/join", ensureAuthenticated, function(req, res) {
	var scope = {};
	contest.get(req.params.id)
		.then(function(cont) { // Check that contest exists
			scope.contest = cont;
			return entry.add({ // Should add a check for time 
				username: req.user.username,
				contest: req.params.id,
				start: moment().format(),
				end: moment().add(scope.contest.time,'m').format(),
				total: "0"
			})
		})
		.then(function(entry){
			res.redirect(".");
		})
		.fail(function(err) {
			if(err.message == "Already in contest"){
                req.session.error = "Already in contest";
				res.redirect(".");
			}
			else{
				req.session.error = "An error was encountered while processing your request";
				res.redirect("/contests");
			}
		})
});	

router.get("/:id/problems/:problem", ensureAuthenticated, function(req, res) {
	var scope = {};
	contest.get(req.params.id)
		.then(function(contest) {
			scope.contest = contest;
			return problem.get(req.params.problem);
		})
		.then(function(prob) {
			scope.problem = prob;
			return submission.all();
		})
		.then(function(submissions) {
            submissions = submissions.filter(function(e) {
                 return e.contest === scope.contest.id;
            });
			submissions.sort(function(a,b){return b.numid-a.numid});
			var mysubs = submissions.filter(function(e) {
				return e.title === scope.problem.title && e.user === req.user.username && e.contest === scope.contest.id;
			});
			res.render("problem", {
				user: req.user,
				problem: scope.problem,
				title: scope.problem.title,
				subtitle: scope.problem.subtitle,
				submissions: submissions,
				mysubmissions: mysubs,
				contest: scope.contest
			});
		})
		.fail(function(err) {
			req.session.error = err.message;
			res.redirect(req.headers.referer || "/");
		});
});

router.post("/:id/submit/:prob", ensureAuthenticated, function(req, res) {
	var scope = {};
	if (!settings.LANGUAGES[req.body.language]) {
		req.session.error = "No such language";
		res.redirect(req.headers.referer || "/");
	}
	else contest.get(req.params.id)
		.then(function(contest) {
			scope.contest = contest;
			return submission.getID();
		})
		.then(function(num) {
			scope.curid = num;
			return problem.get(req.params.prob);
		})
		.then(function(prob) {
			var sub = []; // Empty Subtasks
			for (var a = 1; a <= prob.subtasks.length; ++a)
				sub.push({
					"num": a,
					"maxscore": prob.subtasks[a - 1].score,
					"score": 0
				});
			var obj = {
				numid: scope.curid + 1, // Problem ID
				title: req.params.prob, // Problem Title
				user: req.user.username, // User name
				code: req.body.code, // User code
				score: 0, // Total Score
				compile: "", // Time taken to compile / error message
                submitted_date: moment().format(), // Submission
                graded_date: moment(0).format(), // Grading
				runtime: 0, // Max Time
				contest: req.params.id, // Contest
				language: req.body.language, // Language
				res: sub, // Subtasks
				verdict: "failed", // Verdict
				status: "Sending to server", // Update after compiling and judging
				progress: "Grading" // Update after all subtasks
			};
			return submission.add(obj);
		})
		.then(function() {
			res.redirect("/contests/" + req.params.id + "/submissions/" + (scope.curid + 1));
		})
		.fail(function(err) {
			req.session.error = "An error was encountered while processing your request";
			res.redirect(req.headers.referer || "/");
		});
});

router.get("/:id/submissions/:sub", ensureAuthenticated, function(req, res) {
	var scope = {};
	contest.get(req.params.id)
		.then(function(contest) {
			scope.contest = contest;
			return submission.get(parseInt(req.params.sub));
		})
		.then(function(sub) {
			scope.submission = sub;
			if(sub.contest != req.params.id){
				throw new Error("Wrong submission bro"); // Not sure if this is the correct way to terminate a promise chain early
				return null;
			}
			return problem.get(sub.title);
		})
		.then(function(prob) {
			scope.submission.verdict = scope.submission.verdict.charAt(0).toUpperCase() + scope.submission.verdict.slice(1); // Capitalize
        	scope.submission.language = settings.LANGUAGES[scope.submission.language]; // Change language to be displayed
			scope.submission.compile = atob(scope.submission.compile);
	        res.render("submission", {
	            user: req.user,
	            title: "<a href='/contests/" + req.params.id + "/problems/" + prob.title + "'>" + prob.title + "</a>",
	            subtitle: "#" + scope.submission.numid + " by <a href='/users/" + scope.submission.user + "'>" + scope.submission.user + "</a>",
	            submission: scope.submission,
	            problem: prob,
	            isOwner: req.user && (req.user.username === scope.submission.user),
	            isViewable: req.user && (req.user.username === scope.submission.user || ~ req.user.accepted.indexOf(scope.submission.title)),
	            contest: scope.contest
	        });
		})
		.fail(function(err) {
			//req.session.error = "An error was encountered while processing your request";
			req.session.error = JSON.stringify(err);
			res.redirect(req.headers.referer || "/");
		});
});

router.get("/:id/scoreboard", ensureAuthenticated, function(req, res) {
	var scope = {};
	contest.get(req.params.id)
		.then(function(contest) {
			scope.contest = contest;
			return entry.getEntries(req.params.id);
		})
		.then(function(entries) {
			entries.sort(function(a,b){return b.total-a.total});
			res.render("scoreboard",{
				user: req.user,
				contest: scope.contest,
				entries: entries
			})
		})
		.fail(function() {
			req.session.error = "An error was encountered while processing your request";
			res.redirect(req.headers.referer || "/");
		});
});

router.get("/:id/clarifications", ensureAuthenticated, function(req, res) {
	// Stub - must flesh it out
	var scope = {};
	contest.get(req.params.id)
		.then(function(contest) {
			scope.contest = contest;
			return problem.getProblems(contest.problems);
		})
		.then(function(problems) {
	        scope.problems = problems;
	        return clarification.getClars(req.params.id);
	    })
	    .then(function(clarifications) {
	        res.render("clarifications", {
	            user: req.user,
	            title: "Clarifications",
	            subtitle: "speak now or forever hold your peace",
	            problems: scope.problems,
	            contest: scope.contest,
	            clarifications: clarifications
	        });
	    })
	    .fail(function() {
	        req.session.error = "An error was encountered while processing your request";
	        res.redirect(req.headers.referer || "/");
    });
});

router.post("/:id/clarifications", function(req, res) {
    contest.get(req.params.id)
		.then(function(contest) {
			return clarification.add({
		        "problem": req.body.problem,
		    	"author": req.user.username,
		    	"query": req.body.query,
		    	"contest": req.params.id
		    });
		})
        .then(function() {
            res.redirect("/contests/" + req.params.id + "/clarifications");
        })
        .fail(function() {
            req.session.error = "An error was encountered";
            res.redirect(req.headers.referer || "/");
            res.redirect("/contests/" + req.params.id + "/clarifications");
        })
});

module.exports = router;
