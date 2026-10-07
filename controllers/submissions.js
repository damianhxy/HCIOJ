const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const submission = require("../models/submission.js");
const problem = require("../models/problem.js");
const settings = require("./settings.js");
const ensureAuthenticated = require("../middlewares/auth.js");
const dayjs = require("dayjs");
const io = global.io;

function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

router.post("/api", async function (req, res) {
  let sub;
  try {
    sub = JSON.parse(req.body.data);
  } catch {
    return res.status(400).send("Invalid data");
  }
  if (!secretsMatch(req.body.secret, settings.API_SECRET))
    return res.status(401).send("Unauthorised");
  try {
    const updated = await submission.update(sub);
    io.emit("updateSub", updated);
    res.send("Success");
  } catch (err) {
    res.status(400).send(err.message);
  }
});

router.get("/latest", async function (req, res) {
  try {
    const submissions = await submission.all();
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
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/mine", ensureAuthenticated, async function (req, res) {
  try {
    const submissions = await submission.all();
    const mine = submissions.filter(function (e) {
      return e.user === req.user.username;
    });
    mine.sort(function (a, b) {
      return b.numid - a.numid;
    });
    mine.forEach(function (e) {
      e.language = settings.LANGUAGES[e.language];
    });
    res.render("submissions", {
      user: req.user,
      title: "My Submissions",
      subtitle: "dunjudge.them",
      submissions: mine,
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/queue", async function (req, res) {
  try {
    const submissions = await submission.all();
    const queue = submissions.filter(function (e) {
      return e.restype < 5;
    });
    queue.sort(function (a, b) {
      return b.numid - a.numid;
    });
    queue.forEach(function (e) {
      e.language = settings.LANGUAGES[e.language];
    });
    res.render("queue", {
      user: req.user,
      title: "Grading Queue",
      subtitle: "estimated waiting time: forevah",
      submissions: queue,
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.post("/submit/:problem", ensureAuthenticated, async function (req, res) {
  try {
    if (!settings.LANGUAGES[req.body.language]) {
      req.session.error = "Invalid language";
      return res.redirect(req.headers.referer || "/");
    }
    const id = await submission.getID();
    const info = await problem.get(req.params.problem);
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
      code: typeof req.body.code === "string" ? req.body.code : req.body.ans, // User code ("ans" for problems with files)
      score: 0, // Total Score
      submitted_date: dayjs().format(), // Submission date
      graded_date: "", // Grading
      runtime: 0, // Max Time
      contest: 0, // Contest
      language: req.body.language, // Language
      res: subtasks, // Subtasks
      verdict: "Grading", // Verdict
      status: "Sending to server", // Update after compiling and judging
      progress: "Grading", // Update after all subtasks
      restype: 0, // 0 means sending to grader, 5 means done grading
      type: 1,
    };
    // Send only a bit of info to all users about the submission
    io.emit("newSub", {
      user: req.user.username,
      numid: id + 1,
      problem: req.params.problem,
      language: settings.LANGUAGES[req.body.language],
      progress: "Grading",
      submitted_date: dayjs().format(),
      graded_date: "",
      runtime: 0,
      score: 0,
    });
    await submission.add(obj);
    res.redirect("/submissions/" + obj.numid);
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/:id", async function (req, res) {
  try {
    const sub = await submission.get(parseInt(req.params.id));
    const prob = await problem.get(sub.problem);
    sub.verdict = sub.verdict.charAt(0).toUpperCase() + sub.verdict.slice(1); // Capitalize
    sub.compile = sub.compile ? atob(sub.compile) : "";
    if (sub.graded_date) sub.graded_date = dayjs(sub.graded_date).format(settings.TIME_FORMAT);
    sub.submitted_date = dayjs(sub.submitted_date).format(settings.TIME_FORMAT);
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
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

module.exports = router;
