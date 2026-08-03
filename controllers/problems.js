const express = require("express");
const router = express.Router();
const problem = require("../models/problem.js");
const submission = require("../models/submission.js");
const settings = require("./settings.js");
const moment = require("moment");

router.get("/", async function (req, res) {
  try {
    const problems = await problem.all();
    res.render("problems", {
      user: req.user,
      title: "Problems",
      subtitle: "so many",
      problems: problems,
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/latest", async function (req, res) {
  try {
    const problems = await problem.all();
    problems.sort(function (a, b) {
      if (a.added > b.added) return -1;
      return 1;
    });
    res.render("problems", {
      user: req.user,
      title: "Problems",
      subtitle: "sorted by added time",
      problems: problems,
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/search", async function (req, res) {
  try {
    const all = await problem.all();
    const tag = req.query.query.toLowerCase();
    const problems = all.filter(function (e) {
      if (~e.title.indexOf(tag) || ~e.subtitle.toLowerCase().indexOf(tag)) return true;
      if (e.tags)
        return e.tags.some(function (f) {
          return ~f.toLowerCase().indexOf(tag);
        });
      return false;
    });
    res.render("problems", {
      user: req.user,
      title: "Problems",
      subtitle: "search results",
      problems: problems,
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/:problem", async function (req, res) {
  try {
    const info = await problem.get(req.params.problem);
    const all = await submission.all();
    const submissions = all.filter(function (e) {
      return e.problem === info.title;
    });
    submissions.sort(function (a, b) {
      return b.numid - a.numid;
    });
    submissions.forEach(function (e) {
      e.language = settings.LANGUAGES[e.language];
      e.graded_date = moment(e.graded_date).format(settings.TIME_FORMAT);
      e.submitted_date = moment(e.submitted_date).format(settings.TIME_FORMAT);
    });
    const userSubmissions = submissions.filter(function (e) {
      return req.user && e.user === req.user.username;
    });
    res.render("problem", {
      user: req.user,
      problem: info,
      title: info.title,
      subtitle: info.subtitle,
      submissions: submissions,
      userSubmissions: userSubmissions,
      noCompileOptions: info.subtitle === "Output Only",
    });
  } catch (err) {
    console.log(err);
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

module.exports = router;
