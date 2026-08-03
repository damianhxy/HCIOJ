const express = require("express");
const router = express.Router();
const clarification = require("../models/clarification.js");
const problem = require("../models/problem.js");

router.get("/", async function (req, res) {
  try {
    const problems = await problem.all();
    const clarifications = await clarification.getClars("0");
    res.render("clarifications", {
      user: req.user,
      title: "Clarifications",
      subtitle: "speak now or forever hold your peace",
      problems: problems,
      clarifications: clarifications,
    });
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect(req.headers.referer || "/");
  }
});

router.post("/", async function (req, res) {
  try {
    await clarification.add({
      problem: req.body.problem,
      author: req.user.username,
      query: req.body.query,
      contest: "0",
    });
    res.redirect("/clarifications");
  } catch {
    req.session.error = "An error was encountered";
    res.redirect(req.headers.referer || "/");
  }
});

module.exports = router;
