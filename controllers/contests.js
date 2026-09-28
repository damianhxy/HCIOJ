const express = require("express");
const router = express.Router();
const ensureAuthenticated = require("../middlewares/auth.js");
const problem = require("../models/problem.js");
const contest = require("../models/contest.js");
const clarification = require("../models/clarification.js");
const submission = require("../models/submission.js");
const dayjs = require("dayjs");
const settings = require("./settings.js");
const entry = require("../models/entry.js");

async function requireContestEntry(req, res, next) {
  try {
    const cont = await contest.get(req.params.id);
    if (!cont) throw new Error("Contest not found");

    const ent = await entry.get({
      username: req.user.username,
      contest: req.params.id,
    });
    if (!ent) {
      req.session.error = "Join the contest before accessing its resources";
      return res.redirect("/contests/" + req.params.id);
    }

    req.contest = cont;
    next();
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect("/contests");
  }
}

function requireContestProblem(cont, title) {
  if (!cont.problems.includes(title)) throw new Error("Problem is not part of this contest");
  const prob = problem.get(title);
  if (!prob) throw new Error("Problem not found");
  return prob;
}

router.get("/", ensureAuthenticated, async function (req, res) {
  try {
    const contests = await contest.all();
    res.render("contests", {
      user: req.user,
      title: "Contests",
      subtitle: "all the upcoming contests",
      events: contests,
    });
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect("/");
  }
});

router.get("/:id", ensureAuthenticated, async function (req, res) {
  try {
    const cont = await contest.get(req.params.id);
    const ent = await entry.get({
      username: req.user.username,
      contest: req.params.id,
    });
    if (!ent) {
      return res.render("joincontest", {
        user: req.user,
        title: cont.title,
        subtitle: "contest",
        contest: cont,
      });
    }
    const prob = await problem.getProblems(cont.problems);
    cont.end = dayjs(cont.end).format();
    res.render("contest", {
      user: req.user,
      title: cont.title,
      subtitle: ent.end,
      entry: ent,
      contest: cont,
      problems: prob,
    });
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect("/contests");
  }
});

router.post("/:id/join", ensureAuthenticated, async function (req, res) {
  try {
    const cont = await contest.get(req.params.id);
    await entry.add({
      username: req.user.username,
      contest: req.params.id,
      start: dayjs().format(),
      end: dayjs().add(cont.time, "m").format(),
      total: "0",
    });
    res.redirect("/contests/" + cont.id);
  } catch (err) {
    if (err.message === "Already in contest") {
      req.session.error = "Already in contest";
      res.redirect("/contests/" + req.params.id);
    } else {
      req.session.error = "An error was encountered while processing your request";
      res.redirect("/contests");
    }
  }
});

router.get(
  "/:id/problems/:problem",
  ensureAuthenticated,
  requireContestEntry,
  async function (req, res) {
    try {
      const cont = req.contest;
      const prob = requireContestProblem(cont, req.params.problem);
      const all = await submission.all();
      const submissions = all.filter(function (e) {
        return e.contest === cont.id;
      });
      submissions.sort(function (a, b) {
        return b.numid - a.numid;
      });
      const mysubs = submissions.filter(function (e) {
        return e.title === prob.title && e.user === req.user.username && e.contest === cont.id;
      });
      res.render("problem", {
        user: req.user,
        problem: prob,
        title: prob.title,
        subtitle: prob.subtitle,
        submissions: submissions,
        mysubmissions: mysubs,
        contest: cont,
      });
    } catch (err) {
      req.session.error = err.message;
      res.redirect(req.headers.referer || "/");
    }
  },
);

router.post(
  "/:id/submit/:prob",
  ensureAuthenticated,
  requireContestEntry,
  async function (req, res) {
    try {
      if (!settings.LANGUAGES[req.body.language]) {
        req.session.error = "No such language";
        return res.redirect(req.headers.referer || "/");
      }
      const prob = requireContestProblem(req.contest, req.params.prob);
      const num = await submission.getID();
      const sub = [];
      for (let a = 1; a <= prob.subtasks.length; ++a)
        sub.push({
          num: a,
          maxscore: prob.subtasks[a - 1].score,
          score: 0,
        });
      const obj = {
        numid: num + 1, // Problem ID
        title: req.params.prob, // Problem Title
        user: req.user.username, // User name
        code: req.body.code, // User code
        score: 0, // Total Score
        compile: "", // Time taken to compile / error message
        submitted_date: dayjs().format(), // Submission
        graded_date: dayjs(0).format(), // Grading
        runtime: 0, // Max Time
        contest: req.params.id, // Contest
        language: req.body.language, // Language
        res: sub, // Subtasks
        verdict: "failed", // Verdict
        status: "Sending to server", // Update after compiling and judging
        progress: "Grading", // Update after all subtasks
      };
      await submission.add(obj);
      res.redirect("/contests/" + req.params.id + "/submissions/" + (num + 1));
    } catch {
      req.session.error = "An error was encountered while processing your request";
      res.redirect(req.headers.referer || "/");
    }
  },
);

router.get(
  "/:id/submissions/:sub",
  ensureAuthenticated,
  requireContestEntry,
  async function (req, res) {
    try {
      const cont = req.contest;
      const sub = await submission.get(parseInt(req.params.sub));
      if (sub.contest !== req.params.id) {
        throw new Error("Wrong submission bro");
      }
      const prob = await problem.get(sub.title);
      sub.verdict = sub.verdict.charAt(0).toUpperCase() + sub.verdict.slice(1); // Capitalize
      sub.language = settings.LANGUAGES[sub.language]; // Change language to be displayed
      sub.compile = sub.compile ? atob(sub.compile) : "";
      res.render("submission", {
        user: req.user,
        title: prob.title,
        subtitle: "#" + sub.numid + " by " + sub.user,
        submission: sub,
        problem: prob,
        isOwner: req.user && req.user.username === sub.user,
        isViewable:
          req.user && (req.user.username === sub.user || ~req.user.accepted.indexOf(sub.title)),
        contest: cont,
      });
    } catch (err) {
      req.session.error = JSON.stringify(err);
      res.redirect(req.headers.referer || "/");
    }
  },
);

router.get("/:id/scoreboard", ensureAuthenticated, async function (req, res) {
  try {
    const cont = await contest.get(req.params.id);
    if (!cont.scoreboard) {
      req.session.error = "Scoreboard hidden";
      return res.redirect("/contests/" + cont.id);
    }
    const entries = await entry.getEntries(req.params.id);
    entries.sort(function (a, b) {
      return b.total - a.total;
    });
    res.render("scoreboard", {
      user: req.user,
      contest: cont,
      entries: entries,
    });
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect(req.headers.referer || "/");
  }
});

router.get(
  "/:id/clarifications",
  ensureAuthenticated,
  requireContestEntry,
  async function (req, res) {
    try {
      const cont = req.contest;
      const problems = await problem.getProblems(cont.problems);
      const clarifications = await clarification.getClars(req.params.id);
      res.render("clarifications", {
        user: req.user,
        title: "Clarifications",
        subtitle: "speak now or forever hold your peace",
        problems: problems,
        contest: cont,
        clarifications: clarifications,
      });
    } catch {
      req.session.error = "An error was encountered while processing your request";
      res.redirect(req.headers.referer || "/");
    }
  },
);

router.post(
  "/:id/clarifications",
  ensureAuthenticated,
  requireContestEntry,
  async function (req, res) {
    try {
      if (req.body.problem) requireContestProblem(req.contest, req.body.problem);
      await clarification.add({
        problem: req.body.problem,
        author: req.user.username,
        query: req.body.query,
        contest: req.params.id,
      });
      res.redirect("/contests/" + req.params.id + "/clarifications");
    } catch {
      req.session.error = "An error was encountered";
      res.redirect(req.headers.referer || "/");
    }
  },
);

module.exports = router;
