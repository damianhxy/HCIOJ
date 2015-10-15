var Q = require("q");
var Datastore = require("nedb");
var sessions = new Datastore({filename: './database/sessions', autoload: true});

exports.add = function(user) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(sessions, "findOne", { username: user })
        .then(function(session) {
            if (session)
                return Q.ninvoke(sessions, "update", { username: user }, { $set: { sessions: session.sessions + 1 } });
            else
                return Q.ninvoke(sessions, "insert", { username: user, sessions: 1 });
        })
        .then(function() {
            resolve("Added session");
        })
        .fail(function() {
            reject(Error("Failed to add session"));
        });
    });
};

exports.remove = function(user) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(sessions, "findOne", { username: user })
        .then(function(session) {
            if (session.sessions > 1)
                return Q.ninvoke(sessions, "update", { username: user }, { $set: { sessions: session.sessions - 1 } });
            else
                return Q.ninvoke(sessions, "remove", { username: user, sessions: 1 });
        })
        .then(function() {
            resolve("Removed session");
        })
        .fail(function() {
            reject(Error("Failed to remove session"));
        });
    });
};

exports.all = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(sessions, "find", {})
        .then(function(users) {
            resolve(users);
        })
        .fail(function() {
            reject(Error("Failed to get sessions"));
        });
    });
};

exports.clear = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(sessions, "remove", {})
        .then(function() {
            resolve("Cleared sessions");
        })
        .fail(function() {
            reject(Error("Failed to clear sessions"));
        });
    });
};