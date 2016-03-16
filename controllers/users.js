var express = require("express");
var router = express.Router();
var user = require("../models/user.js");
var submission = require("../models/submission.js");
var settings = require("./settings.js");
var moment = require("moment");

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
            submissions.sort(function(a,b) {
		        return b.numid-a.numid
            })
            submissions.forEach(function(e) {
                e.language = settings.LANGUAGES[e.language];
                e.graded_date = moment(e.graded_date).format(settings.TIME_FORMAT);
                e.submitted_date = moment(e.submitted_date).format(settings.TIME_FORMAT);
            })
            res.render("profile", {
                user: req.user,
                title: info.realname,
                subtitle: "(" + info.username + ", " + info.level + ")",
                ranking: rank + " (of " + users.length + ")",
                profile: info,
                submissions: submissions
            });
        });
    })
    .fail(function() {
        req.session.error = "An error was encountered while processing your request";
        res.redirect(req.headers.referer || "/");
    });
});

module.exports = router;