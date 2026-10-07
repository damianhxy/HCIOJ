const express = require("express");
const router = express.Router();
const ensureAuthenticated = require("../middlewares/auth.js");
const notification = require("../middlewares/notifications.js");
const contest = require("../models/contest.js");
const submission = require("../models/submission.js");
const passport = require("passport");
const session = require("../models/session.js");
const settings = require("./settings.js");
const dayjs = require("dayjs");

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

router.get("/", async function (req, res, next) {
  if (req.user) {
    try {
      const contests = await contest.all();
      const submissions = await submission.all();
      const users = await session.all();
      submissions.sort(function (a, b) {
        return b.numid - a.numid;
      });
      const latest = submissions.slice(0, 10) || [];
      const userSubmissions = latest.filter(function (e) {
        return e.user === req.user.username;
      });
      latest.forEach(function (e) {
        e.language = settings.LANGUAGES[e.language];
        e.graded_date = dayjs(e.graded_date).format(settings.TIME_FORMAT);
        e.submitted_date = dayjs(e.submitted_date).format(settings.TIME_FORMAT);
      });
      res.render("homepage", {
        user: req.user,
        title: "Home",
        subtitle: "an overview",
        events: contests,
        submissions: latest,
        userSubmissions: userSubmissions,
        onlineUsers: users,
      });
    } catch (err) {
      next(err);
    }
  } else {
    res.render("landing");
  }
});

router.get("/logout", ensureAuthenticated, function (req, res) {
  const username = req.user.username;
  req.logout(function (err) {
    if (err) return res.status(500).send("Failed to log out");
    try {
      session.remove(username);
      req.session.destroy(function (destroyErr) {
        if (destroyErr) return res.status(500).send("Failed to log out");
        console.log("Logged " + username + " out");
        res.clearCookie("connect.sid");
        res.redirect("/");
      });
    } catch {
      res.status(500).send("Failed to log out");
    }
  });
});

router.get("/signin", function (req, res) {
  if (req.user) {
    req.session.warning = "You are already signed in";
    res.redirect(req.headers.referer || "/");
  } else res.render("signin", { layout: false });
});

router.post(
  "/signin",
  passport.authenticate("local-signin", {
    successRedirect: "/",
    failureRedirect: "/signin",
  }),
);

router.get("/signup", function (req, res) {
  if (req.user) {
    req.session.warning = "You are already signed in";
    res.redirect(req.headers.referer || "/");
  } else res.render("signup", { layout: false });
});

router.post(
  "/signup",
  passport.authenticate("local-signup", {
    successRedirect: "/",
    failureRedirect: "/signup",
  }),
);

/* 404 & 500 */
router.use(function (req, res) {
  res.status(404).render("404", {
    user: req.user,
    title: "Page Not Found",
  });
});

router.use(function (err, req, res) {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

module.exports = router;
