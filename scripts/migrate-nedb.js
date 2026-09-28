"use strict";

const fs = require("fs");
const path = require("path");

const legacyDir = path.resolve(process.argv[2] || path.join(__dirname, "..", "database"));
const sqlitePath = path.resolve(
  process.argv[3] || path.join(__dirname, "..", "database", "hcioj.db"),
);

if (!fs.existsSync(legacyDir) || !fs.statSync(legacyDir).isDirectory()) {
  throw new Error("Legacy database directory does not exist: " + legacyDir);
}

process.env.DB_PATH = sqlitePath;
const db = require("../models/db.js");

function readNedb(name) {
  const filename = path.join(legacyDir, name);
  if (!fs.existsSync(filename)) return [];

  const documents = new Map();
  fs.readFileSync(filename, "utf8")
    .split(/\r?\n/)
    .forEach(function (line, index) {
      if (!line.trim()) return;
      let value;
      try {
        value = JSON.parse(line);
      } catch (err) {
        throw new Error(filename + ":" + (index + 1) + ": " + err.message, { cause: err });
      }
      if (value.$$indexCreated || value.$$indexRemoved) return;
      if (!value._id) throw new Error(filename + ":" + (index + 1) + ": missing _id");
      if (value.$$deleted) documents.delete(value._id);
      else documents.set(value._id, value);
    });
  return [...documents.values()];
}

function json(value, fallback) {
  return JSON.stringify(value === null || value === undefined ? fallback : value);
}

function list(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.keys(value);
  return [];
}

const sources = {
  users: readNedb("users"),
  submissions: readNedb("submissions"),
  problems: readNedb("problems"),
  contests: readNedb("contests"),
  entries: readNedb("entries"),
  clarifications: readNedb("clarifications"),
};

const nonempty = Object.keys(sources).filter(function (table) {
  return db.prepare("SELECT COUNT(*) AS count FROM " + table).get().count > 0;
});
if (nonempty.length) {
  throw new Error("Refusing to migrate into nonempty tables: " + nonempty.join(", "));
}

const insert = {
  users: db.prepare(
    `INSERT INTO users (username, realname, password, email, level, admin, disabled, avatar, awarded, accepted, partial, failed, score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  submissions: db.prepare(
    `INSERT INTO submissions (numid, title, problem, user, code, score, compile, submitted_date, graded_date, runtime, contest, language, res, verdict, status, progress, restype, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  problems: db.prepare(
    `INSERT INTO problems (title, subtitle, added, tags, subtasks, "desc-html", "desc-txt", "desc-doc", "desc-others", files, awarded)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  contests: db.prepare(
    `INSERT INTO contests (id, title, "desc", start, "end", indi, time, problems, hidden, scoreboard, url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  entries: db.prepare(
    `INSERT INTO entries (username, contest, start, "end", total, awarded)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ),
  clarifications: db.prepare(
    "INSERT INTO clarifications (problem, author, query, answer, contest) VALUES (?, ?, ?, ?, ?)",
  ),
};

const migrate = db.transaction(function () {
  sources.users.forEach(function (item) {
    insert.users.run(
      item.username,
      item.realname || "",
      item.password,
      item.email || "",
      item.level || "",
      item.admin ? 1 : 0,
      item.disabled ? 1 : 0,
      item.avatar || "",
      json(item.awarded, {}),
      json(list(item.accepted), []),
      json(list(item.partial), []),
      json(list(item.failed), []),
      item.score || 0,
    );
  });

  sources.submissions.forEach(function (item) {
    insert.submissions.run(
      item.numid,
      item.title || "",
      item.problem || "",
      item.user,
      item.code || "",
      item.score || 0,
      item.compile || "",
      item.submitted_date || "",
      item.graded_date || "",
      item.runtime || 0,
      String(item.contest === 0 ? "0" : item.contest || "0"),
      item.language || "",
      json(item.res, []),
      item.verdict || "",
      item.status || "",
      item.progress || "",
      item.restype || 0,
      item.type || 1,
    );
  });

  sources.problems.forEach(function (item) {
    insert.problems.run(
      item.title,
      item.subtitle || "",
      item.added || "",
      json(item.tags, []),
      json(item.subtasks, []),
      item["desc-html"] || "",
      item["desc-txt"] || "",
      item["desc-doc"] || "",
      json(item["desc-others"], []),
      json(item.files, []),
      item.awarded || 0,
    );
  });

  sources.contests.forEach(function (item) {
    insert.contests.run(
      String(item.id),
      item.title || "",
      item.desc || "",
      item.start || "",
      item.end || "",
      item.indi ? 1 : 0,
      item.time || 0,
      json(item.problems, []),
      item.hidden ? 1 : 0,
      item.scoreboard ? 1 : 0,
      item.url || "",
    );
  });

  sources.entries.forEach(function (item) {
    insert.entries.run(
      item.username,
      String(item.contest),
      item.start || "",
      item.end || "",
      parseInt(item.total, 10) || 0,
      json(item.awarded, {}),
    );
  });

  sources.clarifications.forEach(function (item) {
    insert.clarifications.run(
      item.problem || "",
      item.author || "",
      item.query || "",
      item.answer || "",
      String(item.contest || "0"),
    );
  });
});

migrate();

Object.entries(sources).forEach(function ([table, documents]) {
  console.log(table + ": " + documents.length);
});
console.log("Migrated legacy NeDB data to " + sqlitePath);
