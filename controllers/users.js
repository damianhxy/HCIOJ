var express = require("express");
var router = express.Router();
var user = require("../models/user.js");
var submission = require("../models/submission.js");

router.get("/rankings", function(req, res) {
    user.all()
    .then(function(users) {
        users.sort(function(a, b) {
            if (a.score > b.score || (a.score === b.score && a.username < b.username))
                return -1;
            return 1;
        });
        users.map(function(e, i, a) {
            if (!i) e.rank = 1;
            else
                e.rank = a[i - 1].rank + (e.score !== a[i - 1].score);
        });
        res.render("rankings", {
            user: req.user,
            title: "Rankings",
            subtitle: "compare and contrast",
            list: users
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered while processing your request";
        res.redirect(req.headers.referer || "/");
    });
});

router.get("/:user", function(req, res) {
    user.all()
    .then(function(users) {
        var rank = 1, info;
        for (var a = 1; a < users.length; ++a) {
            rank += users[a].score !== users[a - 1].score;
            if (users[a].username === req.params.user) {
                info = users[a];
                break;
            }
        }
        submission.all()
        .then(function(submissions) {
            submissions.filter(function(e) {
                return e.user === req.params.user;
            });
            res.render("profile", {
                user: req.user,
                title: info.realname,
                subtitle: "(" + info.username + ", " + info.level + ")",
                ranking: rank,
                profile: info,
                userSubmissions: submissions
            });
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered while processing your request";
        res.redirect(req.headers.referer || "/");
    });
});

module.exports = router;