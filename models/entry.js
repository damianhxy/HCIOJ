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

exports.update = function(obj) {
    return Q.promise(function(resolve, reject) {
        Q.ninvoke(entries, "findOne", obj)
        .then(function(entry) {
            // THIS IS A STUB
        })
        .fail(function() {  
            reject(Error("Failed to update entry"));
        });
    });
}