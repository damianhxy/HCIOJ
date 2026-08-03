"use strict";

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_DIR = path.join(__dirname, "..", "database");
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, "hcioj.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    realname TEXT NOT NULL DEFAULT '',
    password TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    level TEXT NOT NULL DEFAULT '',
    admin INTEGER NOT NULL DEFAULT 0,
    disabled INTEGER NOT NULL DEFAULT 0,
    avatar TEXT NOT NULL DEFAULT '',
    awarded TEXT NOT NULL DEFAULT '{}',
    accepted TEXT NOT NULL DEFAULT '[]',
    partial TEXT NOT NULL DEFAULT '[]',
    failed TEXT NOT NULL DEFAULT '[]',
    score INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS submissions (
    numid INTEGER PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    problem TEXT NOT NULL DEFAULT '',
    user TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0,
    compile TEXT NOT NULL DEFAULT '',
    submitted_date TEXT NOT NULL DEFAULT '',
    graded_date TEXT NOT NULL DEFAULT '',
    runtime INTEGER NOT NULL DEFAULT 0,
    contest TEXT NOT NULL DEFAULT '0',
    language TEXT NOT NULL DEFAULT '',
    res TEXT NOT NULL DEFAULT '[]',
    verdict TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '',
    progress TEXT NOT NULL DEFAULT '',
    restype INTEGER NOT NULL DEFAULT 0,
    type INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    added TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    subtasks TEXT NOT NULL DEFAULT '[]',
    "desc-html" TEXT NOT NULL DEFAULT '',
    "desc-txt" TEXT NOT NULL DEFAULT '',
    "desc-doc" TEXT NOT NULL DEFAULT '',
    "desc-others" TEXT NOT NULL DEFAULT '[]',
    files TEXT NOT NULL DEFAULT '[]',
    awarded INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS contests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    "desc" TEXT NOT NULL DEFAULT '',
    start TEXT NOT NULL DEFAULT '',
    "end" TEXT NOT NULL DEFAULT '',
    indi INTEGER NOT NULL DEFAULT 0,
    time REAL NOT NULL DEFAULT 0,
    problems TEXT NOT NULL DEFAULT '[]',
    hidden INTEGER NOT NULL DEFAULT 0,
    scoreboard INTEGER NOT NULL DEFAULT 0,
    url TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    contest TEXT NOT NULL,
    start TEXT NOT NULL DEFAULT '',
    "end" TEXT NOT NULL DEFAULT '',
    total INTEGER NOT NULL DEFAULT 0,
    awarded TEXT NOT NULL DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    sessions INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS clarifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    query TEXT NOT NULL DEFAULT '',
    answer TEXT NOT NULL DEFAULT '',
    contest TEXT NOT NULL DEFAULT '0'
  );
`);

module.exports = db;
