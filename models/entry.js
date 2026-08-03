const Datastore = require("@seald-io/nedb");
const contest = require("./contest.js");
const entries = new Datastore({ filename: "./database/entries", autoload: true });
const moment = require("moment");

exports.add = async function (entry) {
  const oentry = await entries.findOneAsync({
    username: entry.username,
    contest: entry.contest,
  });
  if (oentry) throw new Error("Already in contest");
  return entries.insertAsync(entry);
};

exports.get = async function (obj) {
  return entries.findOneAsync(obj);
};

exports.getEntries = async function (contest) {
  return entries.findAsync({ contest: contest });
};

exports.update = async function (name, contestId, problem, score) {
  const info = await contest.get(contestId);
  if (moment(info.start) > moment() || moment(info.end) < moment()) return;
  const entry = await entries.findOneAsync({ username: name, contest: contestId });
  if (!entry) return;
  const difference = score - (entry.awarded[problem] || 0);
  if (difference <= 0) return;
  entry.awarded[problem] = score;
  entry.total = (parseInt(entry.total, 10) || 0) + difference;
  await entries.updateAsync({ username: name, contest: contestId }, { $set: entry });
};
