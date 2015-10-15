var Q = require("q");
var Datastore = require("nedb");
var problems = new Datastore({filename: './database/problems', autoload: true});

exports.add = function(problemObject) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(problems, "insert", problemObject)
        .then(function(problem) {
            resolve(problem);
        })
        .fail(function() {
            reject(Error("Failed to add problem"));
        });
    });
};

exports.all = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(problems, "find", {})
        .then(function(list) {
            resolve(list);
        })
        .fail(function() {
            reject(Error("Failed to get list of problems"));
        });
    });
};

exports.get = function(name) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(problems, "findOne", { title: name })
        .then(function(problem) {
            resolve(problem);
        })
        .fail(function() {
            reject(Error("Failed to get problem"));
        });
    });
};
/* Return a list of problem info, based on the names in the array */
exports.getProblems = function(array) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(problems, "find", { title: { $in: array } })
        .then(function(list) {
            resolve(list);
        })
        .fail(function() {
             reject(Error("Failed to get problems"));
        });
    });
};

exports.update = function(name, amt) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(problems, "findOne", { title: name })
        .then(function(problem) {
            return Q.nivnoke(problems, "update", { title: name }, { $set: { awarded: problem.awarded + amt } });
        })
        .then(function() {
            resolve("Problem updated.");
        })
        .fail(function() {
            reject(Error("Failed to update problem"));
        });
    });
};