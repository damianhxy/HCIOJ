var bcryptjs = require("bcryptjs");
var Q = require("q");
var defaultAvatar = "https://s-media-cache-ak0.pinimg.com/236x/46/fa/7a/46fa7a12ed84713abfa2356a357650d1.jpg";
var Datastore = require("nedb");
var users = new Datastore({filename: './database/users', autoload: true});

exports.all = function() {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(users, "find", {})
        .then(function(list) {
            resolve(list);
        })
        .fail(function() {
            reject(Error("Failed to get user list"));
        });
    });
};

exports.authenticate = function(username, password) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(users, "findOne", { username: username })
        .then(function(user) {
            if (!user)
                return reject(Error("User not found"));
            Q.ninvoke(bcryptjs, "compare", password, user.password)
            .then(function(flag) {
                if (flag)
                    return resolve(user);
                return reject(Error("Wrong Password"));
            });
        })
        .fail(function() {
            reject(Error("Authentication failed"));
        });
    });
};

exports.create = function(req, username, password) {
    return Q.promise(function(resolve, reject) {
        username = username.toLowerCase();
        if (password !== req.body.password2)
            return reject("Passwords Mismatch");
        Q.ninvoke(users, "count", { username: username })
        .then(function(count) {
            if (count)
                return reject(Error("Username in use"));
            return Q.ninvoke(bcryptjs, "password", password, 10);
        })
        .then(function(password) {
            var user = {
                "username": username,
                "realname": req.body.realname,
                "password": password,
                "email": req.body.email,
                "level": req.body.level,
                "admin": false,
                "avatar": defaultAvatar,
                "awarded": {},
                "accepted": {},
                "partial": {},
                "failed": {},
                "score": 0
            };
            return Q.ninvoke(users, "insert", user);
        })
        .then(function(user) {
            resolve(user);
        })
        .fail(function() {
            reject(Error("User creation failed"));
        });

    });
};

exports.get = function(id) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(users, "findOne", { _id: id })
        .then(function(result) {
            resolve(result);
        })
        .fail(function() {
            reject(Error("Failed to get user information"));
        });
    });
};

exports.update = function(name, problem, score, verdict) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(users, "findOne", { username: name })
        .then(function(user) {
            if (user.score >= Math.max(user.awarded[problem], 0))
                return resolve(0);
            var currentVerdict = null;
            ["accepted", "partial", "failed"].forEach(function(e) {
                if (~ user[e].indexOf(problem))
                    currentVerdict = e;
            });
            if (currentVerdict !== verdict) {
                if (currentVerdict)
                    user[currentVerdict].splice(user[currentVerdict].indexOf(problem), 1);
                user[verdict].push(problem);
            }
            var difference = score - Math.max(user.awarded[problem], 0);
            user.awarded[problem] = score;
            user.score += difference;
            Q.ninvoke(users, "update", { username: user }, { $set: user })
            .then(function() {
                resolve("Updated user score");
            })
            .fail(function() {
                reject(Error("Failed to update user score"));
            });
        })
        .fail(function() {
            reject(Error("User update failed"));
        });
    });
};