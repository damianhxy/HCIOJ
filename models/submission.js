var Q = require("q");
var Datastore = require("nedb");
var submissions = new Datastore({filename: './database/submissions', autoload: true});
var net = require("net");
var settings = require("../controllers/settings.js");
var user = require("./user.js");
var problem = require("./problem.js");

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
                "prob": submission.title,
                "type": submission.type
            };
            obj["ans." + settings.LANGUAGES[submission.language]] = submission.code;
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
            submission.score = response.totalscore; // Total Score
            submission.runtime = response.maxtime; // Max Time
            submission.time = response.date; // Graded Time
            if (response.compileok) // Compiled
                submission.res = response.subtask; // Subtasks
            submission.status = response.status; // Grading time | "Compilation failed"
            submission.compile = response.compilation; // Compile time | Error Message
            submission.verdict = response.verdict; // Submission verdict
            submission.progress = "Graded";
            Q.ninvoke(submissions, "update", { numid: response.subid }, { $set: submission })
            .then(function() {
                return user.update(response.user, response.problem, response.totalscore, response.verdict);
            })
            .then(function(difference) {
                return problem.update(response.problem, difference);
            })
            .then(function() {
                resolve("Updated score");
            })
            .fail(function() {
                reject(Error("Failed to update score"));
            });
        })
        .fail(function() {
            reject(Error("Failed to update submission"));
        });
    });
};