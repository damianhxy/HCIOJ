var Q = require("q");
var Datastore = require("nedb");
var submissions = new Datastore({filename: './database/submissions', autoload: true});
var net = require("net");
var settings = require("../controllers/settings.js");
var user = require("./user.js");
var problem = require("./problem.js");
var entry = require("./entry.js");
var moment = require("moment");

exports.add = function(submission) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(submissions, "insert", submission)
        .then(function() {
            resolve(submission);
        })
        .fail(function() {
            reject(Error("Failed to save submission"));
        });
    });
};

exports.all = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(submissions, "find", {})
        .then(function(list) {
            list.sort(function(a, b) {
                return a.numid - b.numid;
            });
            list.map(function(e) {
                e.time = moment(e.time).format(settings.SUBMISSION_TIME_FORMAT);
            });
            resolve(list);
        })
        .fail(function() {
            reject(Error("Failed to get submissions"));
        });
    });
};

exports.dispatch = function(submission) {
    return Q.promise(function(resolve, reject) {
        var client = net.createConnection(settings.GRADER_PORT, settings.GRADER_ID);
        client.addListener("connect", function() {
            var obj = {
                "user": submission.user,
                "subid": submission.numid,
                "lang": submission.language,
                "prob": submission.title
            };
            obj["ans." + submission.language] = submission.code;
            obj = JSON.stringify(obj);
            client.write("JYv4pJZNIQidv1pp020" + "0" + ("00000000" + obj.length).slice(-8) + "0" + obj);
            client.end();
            resolve(submission);
        });
        client.addListener("error", function() {
            reject(Error("Failed to dispatch submission"));
        });
    });
};

exports.get = function(id) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(submissions, "findOne", { numid: id })
        .then(function(submission) {
            resolve(submission);
        })
        .fail(function() {
            reject(Error("Failed to get submission"));
        });
    });
};

exports.getID = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(submissions, "count", {})
        .then(function(count) {
            resolve(count);
        })
        .fail(function() {
            reject(Error("Failed to get submission count"));
        });
    });
};

exports.update = function(response) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(submissions, "findOne", { numid: response.subid })
        .then(function(submission) {
            var isContest = submission.contest !== 0;
            if (response.totalscore) submission.score = response.totalscore; // Total Score
            if (response.maxtime) submission.runtime = response.maxtime; // Max Time
            if (response.graded_date) {
                submission.graded_date = response.graded_date; // Graded Date
                submission.progress = "Graded";
            }
            if (response.status) submission.status = response.status; // Grading time | "Compilation failed"
            if (response.compilation) submission.compile = response.compilation; // Compile time | Error Message
            if (response.verdict) submission.verdict = response.verdict; // Submission verdict)

            if (response.subtask) // Subtask Done
                submission.res.some(function(e, i) {
                    if (e.num === response.subtask.num)
                        return submission.res[i].score = response.subtask.score;
                });

            if (response.tc) // Update Testcase
                submission.res.some(function(e, i) {
                    if (e.num === response.tc.subtask) {
                        delete response.tc.subtask;
                        if (e.tcs) return submission.res[i].tcs.push(response.tc);
                        else return submission.res[i].tcs = [response.tc];
                    }
                });

            if (res_type !== 5)
                Q.ninvoke(submissions, "update", { numid: response.subid }, { $set: submission })
                .then(function() {
                    resolve();
                });
            else if (!isContest)
                Q.ninvoke(submissions, "update", { numid: response.subid }, { $set: submission })
                .then(function() {
                    return user.update(response.user, response.problem, response.totalscore, response.verdict);
                })
                .then(function(difference) {
                    return problem.update(response.problem, difference);
                })
                .then(function() {
                    resolve();
                });
            else // Contest
                Q.ninvoke(submissions, "update", { numid: response.subid }, { $set: submission })
                .then(function() {
                    return entry.update(response.user, submission.contest, response.problem, response.totalscore);
                })
                .then(function() {
                    resolve();
                });
        })
        .fail(function() {
            reject(Error("Failed to update submission"));
        });
    });
};