var Q = require("q");
var Datastore = require("nedb");
var entries = new Datastore({filename: './database/entries', autoload: true});

exports.add = function(entry) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(entries, "insert", entry)
        .then(function() {
            resolve("Entered contest");
        })
        .fail(function() {
            reject(Error("Failed to enter contest"));
        });
    });
};

exports.get = function(obj) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(entries, "findOne", obj)
        .then(function(entry) {
            resolve(entry);
        })
        .fail(function() {
            reject(Error("Failed to get entry"));
        });
    });
};

exports.update = function(name, contest, problem, score) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(entries, "findOne", { username: name, contest: contest })
        .then(function(entry) {
            var difference = score - entry.awarded[problem];
            if (difference <= 0) return resolve();
            entry.awarded[problem] = score;
            entry.total += difference;
            Q.ninvoke(entries, "findOne", { username: name, contest: contest }, { $set: entry })
            .then(function() {
                resolve();
            });
        })
        .fail(function() {
            reject(Error("Failed to update entry"));
        });
    });
}