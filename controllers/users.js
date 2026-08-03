const express = require("express");
const router = express.Router();
const user = require("../models/user.js");
const submission = require("../models/submission.js");
const settings = require("./settings.js");
const dayjs = require("dayjs");

router.get("/rankings", async function (req, res) {
  try {
    const users = await user.all();
    users.sort(function (a, b) {
      if (a.score > b.score || (a.score === b.score && a.username < b.username)) return -1;
      return 1;
    });
    users.forEach(function (e, i, a) {
      if (!i) e.rank = 1;
      else e.rank = a[i - 1].rank + (e.score !== a[i - 1].score);
    });
    res.render("rankings", {
      user: req.user,
      title: "Rankings",
      subtitle: "compare and contrast",
      list: users,
    });
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect(req.headers.referer || "/");
  }
});

router.get("/:user", async function (req, res) {
  try {
    const users = await user.all();
    users.sort(function (a, b) {
      if (a.score > b.score || (a.score === b.score && a.username < b.username)) return -1;
      return 1;
    });
    let rank = 1,
      info = null;
    for (let a = 0; a < users.length; ++a) {
      if (a > 0 && users[a].score !== users[a - 1].score) ++rank;
      if (users[a].username === req.params.user) {
        info = users[a];
        break;
      }
    }
    if (!info) {
      req.session.error = "User not found";
      return res.redirect("/");
    }
    const submissions = await submission.all();
    const mine = submissions.filter(function (e) {
      return e.user === req.params.user;
    });
    mine.sort(function (a, b) {
      return b.numid - a.numid;
    });
    mine.forEach(function (e) {
      e.language = settings.LANGUAGES[e.language];
      e.graded_date = dayjs(e.graded_date).format(settings.TIME_FORMAT);
      e.submitted_date = dayjs(e.submitted_date).format(settings.TIME_FORMAT);
    });
    res.render("profile", {
      user: req.user,
      title: info.realname,
      subtitle: "(" + info.username + ", " + info.level + ")",
      ranking: rank + " (of " + users.length + ")",
      profile: info,
      submissions: mine,
    });
  } catch {
    req.session.error = "An error was encountered while processing your request";
    res.redirect(req.headers.referer || "/");
  }
});

module.exports = router;
