"use strict";

const dayjs = require("dayjs");
const contest = require("./contest.js");
const db = require("./db.js");

const stmts = {
  insert: db.prepare(
    `INSERT INTO entries (username, contest, start, "end", total, awarded)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ),
  findOne: db.prepare("SELECT * FROM entries WHERE username = ? AND contest = ?"),
  getEntries: db.prepare("SELECT * FROM entries WHERE contest = ?"),
  update: db.prepare(
    `UPDATE entries SET total = ?, awarded = ? WHERE username = ? AND contest = ?`,
  ),
};

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toEntry(row) {
  if (!row) return null;
  return { ...row, awarded: parseJSON(row.awarded, {}) };
}

exports.add = function (entry) {
  const oentry = stmts.findOne.get(entry.username, String(entry.contest));
  if (oentry) throw new Error("Already in contest");
  stmts.insert.run(
    entry.username,
    String(entry.contest),
    entry.start || "",
    entry.end || "",
    parseInt(entry.total, 10) || 0,
    "{}",
  );
  return "Entered contest";
};

exports.get = function (obj) {
  return toEntry(stmts.findOne.get(obj.username, String(obj.contest)));
};

exports.getEntries = function (contestId) {
  return stmts.getEntries.all(String(contestId)).map(toEntry);
};

exports.update = function (name, contestId, problem, score) {
  const info = contest.get(contestId);
  if (dayjs(info.start) > dayjs() || dayjs(info.end) < dayjs()) return;
  const entry = toEntry(stmts.findOne.get(name, String(contestId)));
  if (!entry) return;
  const difference = score - (entry.awarded[problem] || 0);
  if (difference <= 0) return;
  entry.awarded[problem] = score;
  entry.total = (parseInt(entry.total, 10) || 0) + difference;
  stmts.update.run(entry.total, JSON.stringify(entry.awarded), name, String(contestId));
};
