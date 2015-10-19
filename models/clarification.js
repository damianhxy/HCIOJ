var Q = require("q");
var Datastore = require("nedb");
var clarifications = new Datastore({filename: './database/clarifications', autoload: true});

exports.add = function(clarification) {
    return Q.promise(function (resolve, reject) {
        Q.ninvoke(clarifications, "insert", clarification)
        .then(function(result) {
            resolve(result);
        })
        .fail(function() {
            reject(Error("Failed to add clarification"));
        });
    });
};

exports.all = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(clarifications, "find", {})
        .then(function(list) {
            resolve(list);
        })
        .fail(function() {
            reject(Error("Failed to get clarifications"));
        });
    });
};

exports.getID = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(clarifications, "count", {})
        .then(function(count) {
            resolve(count);
        })
        .fail(function() {
            reject(Error("Failed to get clarification count"));
        });
    });
};

exports.edit = function(id, newClarification) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(clarifications, "update", { id: id }, { $set: newClarification })
        .then(function(clarification) {
            resolve(clarification);
        })
        .fail(function() {
            reject(Error("Failed to edit clarification"));
        });
    });
};

exports.getClars = function(contest) { // Returns array of clarifications based on contest id
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(clarifications, "find", { contest : contest })
        .then(function(list) {
            resolve(list);
        })
        .fail(function() {
             reject(Error("Failed to get entries"));
        });
    });
}