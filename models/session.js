"use strict";

const db = require("./db.js");

const stmts = {
  findOne: db.prepare("SELECT * FROM sessions WHERE username = ?"),
  insert: db.prepare("INSERT INTO sessions (username, sessions) VALUES (?, 1)"),
  increment: db.prepare("UPDATE sessions SET sessions = sessions + 1 WHERE username = ?"),
  decrement: db.prepare("UPDATE sessions SET sessions = sessions - 1 WHERE username = ?"),
  remove: db.prepare("DELETE FROM sessions WHERE username = ?"),
  all: db.prepare("SELECT * FROM sessions"),
  clear: db.prepare("DELETE FROM sessions"),
};

exports.add = function (user) {
  const session = stmts.findOne.get(user);
  if (session) stmts.increment.run(user);
  else stmts.insert.run(user);
};

exports.remove = function (user) {
  const session = stmts.findOne.get(user);
  if (!session) return;
  if (session.sessions > 1) stmts.decrement.run(user);
  else stmts.remove.run(user);
};

exports.all = function () {
  return stmts.all.all();
};

exports.clear = function () {
  stmts.clear.run();
};
