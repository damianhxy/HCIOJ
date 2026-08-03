const express = require("express");
const router = express.Router();
const ensureAdmin = require("../middlewares/admin.js");
const problem = require("../models/problem.js");
const contest = require("../models/contest.js");

router.use(ensureAdmin);

router.get("/", function (req, res) {
  res.render("admin", {
    user: req.user,
    title: "Admin Panel",
    subtitle: "hurr",
  });
});

// Edit Users

router.get("/users", function (req, res) {
  res.render("edituser", {
    user: req.user,
    title: "Editing Users",
    subtitle: "Admin",
  });
});

// Edit Problems

router.get("/problems", function (req, res) {
  res.render("editproblem", {
    user: req.user,
    title: "Editing Problems",
    subtitle: "Admin",
  });
});

router.get("/problems/new", async function (req, res) {
  try {
    res.render("editproblem", {
      user: req.user,
      title: "Editing Problems",
      subtitle: "Admin",
      submit: "/admin/addproblem",
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/admin/problems");
  }
});

router.get("/problems/:id", async function (req, res) {
  try {
    const prob = await problem.get(req.params.id);
    res.render("editproblem", {
      user: req.user,
      title: "Editing Problems",
      subtitle: "Admin",
      problem: prob,
      submit: "/admin/editproblem",
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/admin/problems");
  }
});

router.post("/addproblem", async function (req, res) {
  try {
    await problem.add({
      title: req.body.title,
      subtitle: req.body.subtitle,
    });
    req.session.success = "Problem Added Successfully";
    res.redirect("/admin/problems");
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect("/admin/problems");
  }
});

router.post("/editproblem", async function (req, res) {
  try {
    const cont = await contest.get(req.body.id);
    if (!("problems" in req.body)) req.body.problems = "";
    await contest.edit(cont.id, {
      title: req.body.title,
      desc: req.body.desc,
      start: req.body.start,
      end: req.body.end,
      indi: req.body.indi === "on",
      time: parseFloat(req.body.time),
      problems: req.body.problems.split(","),
      hidden: req.body.hidden === "on",
    });
    req.session.success = "Contest Edited Successfully";
    res.redirect("/admin/contests");
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect("/admin/contests");
  }
});

// Edit Contests

router.get("/contests", async function (req, res) {
  try {
    const problems = await problem.all();
    res.render("editcontest", {
      user: req.user,
      title: "Editing Contests",
      subtitle: "Admin",
      problems: problems,
      submit: "/admin/addcontest",
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/contests/new", async function (req, res) {
  try {
    const problems = await problem.all();
    res.render("editcontest", {
      user: req.user,
      title: "Editing Contests",
      subtitle: "Admin",
      problems: problems,
      submit: "/admin/addcontest",
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/contests/:id", async function (req, res) {
  try {
    const cont = await contest.get(req.params.id);
    const problems = await problem.all();
    res.render("editcontest", {
      user: req.user,
      title: "Editing Contests",
      subtitle: "Admin",
      problems: problems,
      contest: cont,
      submit: "/admin/editcontest",
    });
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

router.post("/addcontest", async function (req, res) {
  try {
    const numid = await contest.getID();
    if (!("problems" in req.body)) req.body.problems = "";
    await contest.add({
      id: numid.toString(),
      title: req.body.title,
      desc: req.body.desc,
      start: req.body.start,
      end: req.body.end,
      indi: req.body.indi === "on",
      time: parseInt(req.body.time),
      problems: req.body.problems.split(","),
      hidden: req.body.hidden === "on",
      scoreboard: req.body.scoreboard === "on",
      url: "/contests/" + numid,
    });
    req.session.success = "Contest Added Successfully";
    res.redirect("/admin/contests");
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect("/admin/contests");
  }
});

router.post("/editcontest", async function (req, res) {
  try {
    const cont = await contest.get(req.body.id);
    if (!("problems" in req.body)) req.body.problems = "";
    await contest.edit(cont.id, {
      title: req.body.title,
      desc: req.body.desc,
      start: req.body.start,
      end: req.body.end,
      indi: req.body.indi === "on",
      time: parseFloat(req.body.time),
      problems: req.body.problems.split(","),
      hidden: req.body.hidden === "on",
    });
    req.session.success = "Contest Edited Successfully";
    res.redirect("/admin/contests");
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect("/admin/contests");
  }
});

module.exports = router;
