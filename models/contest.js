var Q = require("q");
var Datastore = require("nedb");
var contests = new Datastore({filename: './database/contests', autoload: true});

exports.add = function(contest) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(contests, "insert", contest)
        .then(function() {
            resolve("Added contest");
        })
        .fail(function() {
            reject(Error("Failed to add contest"));
        });
    });
};

exports.all = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(contests, "find", {})
        .then(function(list) {
            resolve(list);
        })
        .fail(function() {
            reject(Error("Failed to get list of contests"));
        });
    });
};
/* // To go under entry model
exports.checkEntry = function(name, contestID) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(contests, "findOne", { id: contestID })
        .then(function(contest) {
            resolve(! ~ contest.users.indexOf(name));
        })
        .fail(function() {
            reject(Error("Failed to check entry"));
        });
    });
};

exports.enter = function(name, contestID) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(contests, "findOne", { id: contestID })
        .then(function(contest) {
            if (~ contest.users.indexOf(name))
                return reject(Error("Already entered contest"));
            contests.users.push(name);
            Q.ninvoke(contests, "update", { id: contestID }, { $set: contest });
        })
        .then(function() {
            resolve("Entered contest");
        })
        .fail(function() {
            reject(Error("Failed to enter contest"));
        });
    });
};
*/
exports.get = function(id) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(contests, "findOne", { id: id })
        .then(function(contest) {
            resolve(contest);
        })
        .fail(function() {
            reject(Error("Failed to get contest"));
        });
    });
};

exports.getID = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(contests, "count", {})
        .then(function(count) {
            resolve(count);
        })
        .fail(function() {
            reject(Error("Failed to get contest count"));
        });
    });
};