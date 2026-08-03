"use strict";

const db = require("./db.js");

const stmts = {
  insert: db.prepare(
    `INSERT INTO contests (id, title, "desc", start, "end", indi, time, problems, hidden, scoreboard, url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  all: db.prepare("SELECT * FROM contests"),
  findById: db.prepare("SELECT * FROM contests WHERE id = ?"),
  count: db.prepare("SELECT COUNT(*) AS count FROM contests"),
  update: db.prepare(
    `UPDATE contests SET title = ?, "desc" = ?, start = ?, "end" = ?, indi = ?, time = ?, problems = ?, hidden = ?, scoreboard = ? WHERE id = ?`,
  ),
};

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toContest(row) {
  if (!row) return null;
  return {
    ...row,
    indi: !!row.indi,
    hidden: !!row.hidden,
    scoreboard: !!row.scoreboard,
    problems: parseJSON(row.problems, []),
  };
}

exports.add = function (contest) {
  stmts.insert.run(
    String(contest.id),
    contest.title || "",
    contest.desc || "",
    contest.start || "",
    contest.end || "",
    contest.indi ? 1 : 0,
    contest.time || 0,
    JSON.stringify(contest.problems || []),
    contest.hidden ? 1 : 0,
    contest.scoreboard ? 1 : 0,
    contest.url || "",
  );
  return "Added contest";
};

exports.all = function () {
  return stmts.all.all().map(toContest);
};

exports.get = function (id) {
  return toContest(stmts.findById.get(String(id)));
};

exports.getID = function () {
  return stmts.count.get().count + 1;
};

exports.edit = function (id, newContest) {
  stmts.update.run(
    newContest.title || "",
    newContest.desc || "",
    newContest.start || "",
    newContest.end || "",
    newContest.indi ? 1 : 0,
    newContest.time || 0,
    JSON.stringify(newContest.problems || []),
    newContest.hidden ? 1 : 0,
    newContest.scoreboard ? 1 : 0,
    String(id),
  );
  return "Edited contest";
};
