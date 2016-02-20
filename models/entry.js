var Q = require("q");
var Datastore = require("nedb");
var contest = require("./contest.js");
var entries = new Datastore({filename: './database/entries', autoload: true});
var moment = require("moment");

exports.add = function(entry) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(entries, "findOne", { 
            username: entry.username,
            contest: entry.contest
        })
        .then(function(oentry) {
            if(oentry){
                reject(Error("Already in contest"));
            }
            else{
                Q.ninvoke(entries, "insert", entry)
                .then(function() {
                    resolve("Entered contest");
                })
                .fail(function() {
                    reject(Error("Failed to enter contest"));
                });
            }
        })
        .fail(function() {
            reject(Error("Failed to check entry uniqueness"));
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

exports.getEntries = function(contest) { // Returns array of entries based on contest id
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(entries, "find", { contest : contest })
        .then(function(list) {
            resolve(list);
        })
        .fail(function() {
             reject(Error("Failed to get entries"));
        });
    });
}

exports.update = function(name, contest, problem, score) {
    return Q.promise(function(resolve, reject) {
        contest.get(contest)
        .then(function(info) {
            if (moment(info.start) > moment(Date.now)) // Contest hasn't started
                resolve();
            if (moment(info.end) < moment(Date.now)) // Contest already ended
                resolve();
            else
                Q.ninvoke(entries, "findOne", { username: name, contest: contest })
                .then(function(entry) {
                    var difference = score - entry.awarded[problem];
                    if (difference <= 0) return resolve();
                    entry.awarded[problem] = score;
                    entry.total += difference;
                    return Q.ninvoke(entries, "findOne", { username: name, contest: contest }, { $set: entry })

                })
                .then(function() {
                    resolve();
                });
        })
        .fail(function() {
            reject(Error("Failed to update entry"));
        });
    });
}
