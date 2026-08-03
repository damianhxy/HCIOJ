const Q = require("q");
const Datastore = require("@seald-io/nedb");
const contest = require("./contest.js");
const entries = new Datastore({ filename: "./database/entries", autoload: true });
const moment = require("moment");

exports.add = function (entry) {
  return Q.promise(function (resolve, reject) {
    Q.ninvoke(entries, "findOne", {
      username: entry.username,
      contest: entry.contest,
    })
      .then(function (oentry) {
        if (oentry) {
          reject(Error("Already in contest"));
        } else {
          Q.ninvoke(entries, "insert", entry)
            .then(function () {
              resolve("Entered contest");
            })
            .fail(function () {
              reject(Error("Failed to enter contest"));
            });
        }
      })
      .fail(function () {
        reject(Error("Failed to check entry uniqueness"));
      });
  });
};

exports.get = function (obj) {
  return Q.promise(function (resolve, reject) {
    Q.ninvoke(entries, "findOne", obj)
      .then(function (entry) {
        resolve(entry);
      })
      .fail(function () {
        reject(Error("Failed to get entry"));
      });
  });
};

exports.getEntries = function (contest) {
  // Returns array of entries based on contest id
  return Q.promise(function (resolve, reject) {
    Q.ninvoke(entries, "find", { contest: contest })
      .then(function (list) {
        resolve(list);
      })
      .fail(function () {
        reject(Error("Failed to get entries"));
      });
  });
};

exports.update = function (name, contestId, problem, score) {
  return Q.promise(function (resolve, reject) {
    contest
      .get(contestId)
      .then(function (info) {
        if (moment(info.start) > moment() || moment(info.end) < moment()) {
          resolve();
          return;
        }
        return Q.ninvoke(entries, "findOne", { username: name, contest: contestId })
          .then(function (entry) {
            if (!entry) return;
            const difference = score - (entry.awarded[problem] || 0);
            if (difference <= 0) return;
            entry.awarded[problem] = score;
            entry.total = (parseInt(entry.total, 10) || 0) + difference;
            return Q.ninvoke(
              entries,
              "update",
              { username: name, contest: contestId },
              { $set: entry },
            );
          })
          .then(function () {
            resolve();
          });
      })
      .fail(function () {
        reject(Error("Failed to update entry"));
      });
  });
};
