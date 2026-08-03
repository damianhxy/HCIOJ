"use strict";

const db = require("./db.js");

const stmts = {
  insert: db.prepare(
    "INSERT INTO clarifications (problem, author, query, answer, contest) VALUES (?, ?, ?, ?, ?)",
  ),
  all: db.prepare("SELECT * FROM clarifications"),
  count: db.prepare("SELECT COUNT(*) AS count FROM clarifications"),
  findByContest: db.prepare("SELECT * FROM clarifications WHERE contest = ?"),
  update: db.prepare(
    "UPDATE clarifications SET problem = ?, author = ?, query = ?, answer = ?, contest = ? WHERE id = ?",
  ),
};

exports.add = function (clarification) {
  return stmts.insert.run(
    clarification.problem || "",
    clarification.author || "",
    clarification.query || "",
    clarification.answer || "",
    String(clarification.contest || "0"),
  );
};

exports.all = function () {
  return stmts.all.all();
};

exports.getID = function () {
  return stmts.count.get().count;
};

exports.edit = function (id, newClarification) {
  return stmts.update.run(
    newClarification.problem || "",
    newClarification.author || "",
    newClarification.query || "",
    newClarification.answer || "",
    String(newClarification.contest || "0"),
    id,
  );
};

exports.getClars = function (contest) {
  return stmts.findByContest.all(String(contest || "0"));
};
