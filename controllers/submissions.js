const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const submission = require("../models/submission.js");
const problem = require("../models/problem.js");
const settings = require("./settings.js");
const ensureAuthenticated = require("../middlewares/auth.js");
const moment = require("moment");
const io = global.io;

function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

router.post("/api", function (req, res) {
  let sub;
  try {
    sub = JSON.parse(req.body.data);
  } catch {
    return res.status(400).send("Invalid data");
  }
  if (!secretsMatch(req.body.secret, settings.API_SECRET))
    return res.status(401).send("Unauthorised");
  submission
    .update(sub)
    .then(function (sub) {
      io.emit("updateSub", sub);
      res.send("Success");
    })
    .fail(function (err) {
      res.send(err);
    });
});

router.get("/latest", function (req, res) {
  submission
    .all()
    .then(function (submissions) {
      submissions.sort(function (a, b) {
        return b.numid - a.numid;
      });
      submissions.forEach(function (e) {
        e.language = settings.LANGUAGES[e.language];
      });
      res.render("submissions", {
        user: req.user,
        title: "Latest Submissions",
        subtitle: "dunjudge.them",
        submissions: submissions,
      });
    })
    .fail(function () {
      req.session.error = "An error was encountered";
      res.redirect(req.headers.referer || "/");
    });
});

router.get("/mine", ensureAuthenticated, function (req, res) {
  submission
    .all()
    .then(function (submissions) {
      submissions = submissions.filter(function (e) {
        return e.user === req.user.username;
      });
      submissions.sort(function (a, b) {
        return b.numid - a.numid;
      });
      submissions.forEach(function (e) {
        e.language = settings.LANGUAGES[e.language];
      });
      res.render("submissions", {
        user: req.user,
        title: "My Submissions",
        subtitle: "dunjudge.them",
        submissions: submissions,
      });
    })
    .fail(function () {
      req.session.error = "An error was encountered";
      res.redirect(req.headers.referer || "/");
    });
});

router.get("/queue", function (req, res) {
  submission
    .all()
    .then(function (submissions) {
      submissions = submissions.filter(function (e) {
        return e.restype < 5;
      });

      // Replace this sort with some sort of sorting mechanism maybe
      submissions.sort(function (a, b) {
        return b.numid - a.numid;
      });

      // Replace the file extensions with the name of the Language
      submissions.forEach(function (e) {
        e.language = settings.LANGUAGES[e.language];
      });

      res.render("queue", {
        user: req.user,
        title: "Grading Queue",
        subtitle: "estimated waiting time: forevah",
        submissions: submissions,
      });
    })
    .fail(function () {
      req.session.error = "An error was encountered";
      res.redirect(req.headers.referer || "/");
    });
});

router.post("/submit/:problem", ensureAuthenticated, function (req, res) {
  if (!settings.LANGUAGES[req.body.language]) {
    req.session.error = "Invalid language";
    res.redirect(req.headers.referer || "/");
  } else
    submission
      .getID()
      .then(function (id) {
        problem.get(req.params.problem).then(function (info) {
          const subtasks = [];
          info.subtasks.forEach(function (e, i, a) {
            subtasks.push({
              num: i + 1,
              maxscore: a[i].score,
              score: 0,
            });
          });
          const obj = {
            numid: id + 1, // Problem ID
            problem: req.params.problem, // Problem Title
            user: req.user.username, // User name
            code: req.body.ans, // User code
            score: 0, // Total Score
            submitted_date: moment().format(), // Submission date
            graded_date: "", // Grading
            runtime: 0, // Max Time
            contest: 0, // Contest
            language: req.body.language, // Language
            res: subtasks, // Subtasks
            verdict: "Grading", // Verdict
            status: "Sending to server", // Update after compiling and judging
            progress: "Grading", // Update after all subtasks
            restype: 0, // 0 means sending to grader, 5 means done grading
            type: 1, // Need to change this
          };
          // Send only a bit of info to all users about the submission
          io.emit("newSub", {
            user: req.user.username,
            numid: id + 1,
            problem: req.params.problem,
            language: settings.LANGUAGES[req.body.language],
            progress: "Grading",
            submitted_date: moment().format(),
            graded_date: "",
            runtime: 0,
            score: 0,
          });
          submission.add(obj).then(function (obj) {
            //     return submission.dispatch(obj);
            // })
            // .then(function(obj) {
            res.redirect("/submissions/" + obj.numid);
          });
        });
      })
      .fail(function () {
        req.session.error = "An error was encountered";
        res.redirect(req.headers.referer || "/");
      });
});

router.get("/:id", function (req, res) {
  submission
    .get(parseInt(req.params.id))
    .then(function (sub) {
      problem.get(sub.problem).then(function (prob) {
        sub.verdict = sub.verdict.charAt(0).toUpperCase() + sub.verdict.slice(1); // Capitalize
        sub.compile = sub.compile ? atob(sub.compile) : "";
        if (sub.graded_date) sub.graded_date = moment(sub.graded_date).format(settings.TIME_FORMAT);
        sub.submitted_date = moment(sub.submitted_date).format(settings.TIME_FORMAT);
        res.render("submission", {
          user: req.user,
          title: sub.problem,
          subtitle: "#" + sub.numid + " by " + sub.user,
          submission: sub,
          isOwner: req.user && req.user.username === sub.user,
          isViewable:
            req.user && (req.user.username === sub.user || ~req.user.accepted.indexOf(sub.problem)),
          problem: prob,
        });
      });
    })
    .fail(function () {
      req.session.error = "An error was encountered";
      res.redirect(req.headers.referer || "/");
    });
});

module.exports = router;
