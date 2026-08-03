const express = require("express");
const router = express.Router();
const clarification = require("../models/clarification.js");
const problem = require("../models/problem.js");

router.get("/", function (req, res) {
  const scope = {};
  problem
    .all()
    .then(function (problems) {
      scope.problems = problems;
      return clarification.getClars("0");
    })
    .then(function (clarifications) {
      res.render("clarifications", {
        user: req.user,
        title: "Clarifications",
        subtitle: "speak now or forever hold your peace",
        problems: scope.problems,
        clarifications: clarifications,
      });
    })
    .fail(function () {
      req.session.error = "An error was encountered while processing your request";
      res.redirect(req.headers.referer || "/");
    });
});

router.post("/", function (req, res) {
  clarification
    .add({
      problem: req.body.problem,
      author: req.user.username,
      query: req.body.query,
      contest: "0",
    })
    .then(function () {
      res.redirect("/clarifications");
    })
    .fail(function () {
      req.session.error = "An error was encountered";
      res.redirect(req.headers.referer || "/");
    });
});

module.exports = router;
