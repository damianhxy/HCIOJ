"use strict";

const db = require("./db.js");

const stmts = {
  insert: db.prepare(
    `INSERT INTO problems (title, subtitle, added, tags, subtasks, "desc-html", "desc-txt", "desc-doc", "desc-others", files, awarded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  all: db.prepare("SELECT * FROM problems"),
  findByTitle: db.prepare("SELECT * FROM problems WHERE title = ?"),
  updateAwarded: db.prepare("UPDATE problems SET awarded = ? WHERE title = ?"),
};

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toProblem(row) {
  if (!row) return null;
  return {
    ...row,
    tags: parseJSON(row.tags, []),
    subtasks: parseJSON(row.subtasks, []),
    "desc-others": parseJSON(row["desc-others"], []),
    files: parseJSON(row.files, []),
  };
}

exports.add = function (problemObject) {
  const result = stmts.insert.run(
    problemObject.title,
    problemObject.subtitle || "",
    problemObject.added || "",
    JSON.stringify(problemObject.tags || []),
    JSON.stringify(problemObject.subtasks || []),
    problemObject["desc-html"] || "",
    problemObject["desc-txt"] || "",
    problemObject["desc-doc"] || "",
    JSON.stringify(problemObject["desc-others"] || []),
    JSON.stringify(problemObject.files || []),
    problemObject.awarded || 0,
  );
  return toProblem(stmts.findByTitle.get(result.lastInsertRowid) || { title: problemObject.title });
};

exports.all = function () {
  return stmts.all.all().map(toProblem);
};

exports.get = function (name) {
  return toProblem(stmts.findByTitle.get(name));
};

exports.getProblems = function (array) {
  if (!array || array.length === 0) return [];
  const placeholders = array
    .map(function () {
      return "?";
    })
    .join(", ");
  return db
    .prepare("SELECT * FROM problems WHERE title IN (" + placeholders + ")")
    .all(...array)
    .map(toProblem);
};

exports.update = function (name, amt) {
  const problem = toProblem(stmts.findByTitle.get(name));
  if (!problem) throw new Error("Problem not found");
  stmts.updateAwarded.run((problem.awarded || 0) + amt, name);
  return "Problem updated.";
};
