"use strict";

const bcryptjs = require("bcryptjs");
const defaultAvatar =
  "https://s-media-cache-ak0.pinimg.com/236x/46/fa/7a/46fa7a12ed84713abfa2356a357650d1.jpg";
const db = require("./db.js");

const stmts = {
  all: db.prepare("SELECT * FROM users"),
  findByUsername: db.prepare("SELECT * FROM users WHERE username = ?"),
  findById: db.prepare("SELECT * FROM users WHERE id = ?"),
  countByUsername: db.prepare("SELECT COUNT(*) AS count FROM users WHERE username = ?"),
  insert: db.prepare(
    `INSERT INTO users (username, realname, password, email, level, admin, disabled, avatar, awarded, accepted, partial, failed, score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ),
  update: db.prepare(
    "UPDATE users SET awarded = ?, accepted = ?, partial = ?, failed = ?, score = ? WHERE username = ?",
  ),
};

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toUser(row) {
  if (!row) return null;
  return {
    ...row,
    admin: !!row.admin,
    disabled: !!row.disabled,
    awarded: parseJSON(row.awarded, {}),
    accepted: parseJSON(row.accepted, []),
    partial: parseJSON(row.partial, []),
    failed: parseJSON(row.failed, []),
  };
}

exports.all = function () {
  return stmts.all.all().map(toUser);
};

exports.authenticate = function (username, password) {
  const user = toUser(stmts.findByUsername.get(username));
  if (!user) throw new Error("Invalid username or password");
  const flag = bcryptjs.compareSync(password, user.password);
  if (!flag) throw new Error("Invalid username or password");
  return user;
};

exports.create = function (req, username, password) {
  username = username.toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    throw new Error(
      "Username must be 3-20 characters and contain only letters, numbers, and underscores",
    );
  if (password !== req.body.password2) throw new Error("Passwords Mismatch");
  const existing = stmts.countByUsername.get(username);
  if (existing.count) throw new Error("Username in use: " + username);
  const hash = bcryptjs.hashSync(password, 10);
  const result = stmts.insert.run(
    username,
    req.body.realname || "",
    hash,
    req.body.email || "",
    req.body.level || "",
    0,
    0,
    defaultAvatar,
    "{}",
    "[]",
    "[]",
    "[]",
    0,
  );
  return toUser(stmts.findById.get(result.lastInsertRowid));
};

exports.get = function (id) {
  return toUser(stmts.findById.get(id));
};

exports.update = function (name, problem, score, verdict) {
  const user = toUser(stmts.findByUsername.get(name));
  if (!user) throw new Error("User not found");
  if ((user.awarded[problem] || 0) >= score) return 0;
  let currentVerdict = null;
  ["accepted", "partial", "failed"].forEach(function (e) {
    if (~user[e].indexOf(problem)) currentVerdict = e;
  });
  if (currentVerdict !== verdict) {
    if (currentVerdict) user[currentVerdict].splice(user[currentVerdict].indexOf(problem), 1);
    user[verdict].push(problem);
  }
  const difference = score - (user.awarded[problem] || 0);
  user.awarded[problem] = score;
  user.score += difference;
  stmts.update.run(
    JSON.stringify(user.awarded),
    JSON.stringify(user.accepted),
    JSON.stringify(user.partial),
    JSON.stringify(user.failed),
    user.score,
    name,
  );
  return difference;
};
