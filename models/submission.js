"use strict";

const net = require("net");
const db = require("./db.js");
const settings = require("../controllers/settings.js");
const user = require("./user.js");
const problem = require("./problem.js");
const entry = require("./entry.js");

const stmts = {
  insert: db.prepare(
    `INSERT INTO submissions (numid, title, problem, user, code, score, compile, submitted_date, graded_date, runtime, contest, language, res, verdict, status, progress, restype, type)
     VALUES (@numid, @title, @problem, @user, @code, @score, @compile, @submitted_date, @graded_date, @runtime, @contest, @language, @res, @verdict, @status, @progress, @restype, @type)`,
  ),
  all: db.prepare("SELECT * FROM submissions ORDER BY numid ASC"),
  findById: db.prepare("SELECT * FROM submissions WHERE numid = ?"),
  count: db.prepare("SELECT COUNT(*) AS count FROM submissions"),
  persist: db.prepare(
    `UPDATE submissions SET title = @title, problem = @problem, user = @user, code = @code, score = @score,
     compile = @compile, submitted_date = @submitted_date, graded_date = @graded_date, runtime = @runtime,
     contest = @contest, language = @language, res = @res, verdict = @verdict, status = @status,
     progress = @progress, restype = @restype, type = @type WHERE numid = @numid`,
  ),
};

function parseJSON(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toRow(submission) {
  return {
    numid: submission.numid,
    title: submission.title || "",
    problem: submission.problem || "",
    user: submission.user,
    code: submission.code || "",
    score: submission.score || 0,
    compile: submission.compile || "",
    submitted_date: submission.submitted_date || "",
    graded_date: submission.graded_date || "",
    runtime: submission.runtime || 0,
    contest: String(submission.contest === 0 ? "0" : submission.contest || "0"),
    language: submission.language || "",
    res: JSON.stringify(submission.res || []),
    verdict: submission.verdict || "",
    status: submission.status || "",
    progress: submission.progress || "",
    restype: submission.restype || 0,
    type: submission.type || 1,
  };
}

function toSubmission(row) {
  if (!row) return null;
  return { ...row, res: parseJSON(row.res, []) };
}

exports.add = function (submission) {
  stmts.insert.run(toRow(submission));
  return submission;
};

exports.all = function () {
  return stmts.all.all().map(toSubmission);
};

exports.dispatch = function (submission) {
  return new Promise(function (resolve, reject) {
    const client = net.createConnection(settings.GRADER_PORT, settings.GRADER_IP);
    client.addListener("connect", function () {
      const obj = {
        user: submission.user,
        subid: submission.numid,
        lang: submission.language,
        prob: submission.title || submission.problem,
      };
      obj["ans." + submission.language] = submission.code;
      const payload = JSON.stringify(obj);
      client.write(
        settings.GRADER_KEY + "0" + ("00000000" + payload.length).slice(-8) + "0" + payload,
      );
      client.end();
      resolve(submission);
    });
    client.addListener("error", function () {
      reject(new Error("Failed to dispatch submission"));
    });
  });
};

exports.get = function (id) {
  return toSubmission(stmts.findById.get(id));
};

exports.getID = function () {
  return stmts.count.get().count;
};

exports.update = function (response) {
  const submission = toSubmission(stmts.findById.get(response.subid));
  if (!submission) throw new Error("Submission not found");
  const isContest = submission.contest !== "0";
  if (Number.isInteger(response.restype)) submission.restype = response.restype;
  if (response.totalscore) submission.score = response.totalscore; // Total Score
  if (response.maxtime) submission.runtime = response.maxtime; // Max Time
  if (response.graded_date) {
    submission.graded_date = response.graded_date; // Graded Date
    submission.progress = "Graded";
  }
  if (response.status) submission.status = response.status; // Grading time | "Compilation failed"
  if (response.compilation) submission.compile = response.compilation; // Compile time | Error Message
  if (response.verdict) submission.verdict = response.verdict; // Submission verdict

  if (response.subtask)
    // Subtask Done
    submission.res.some(function (e, i) {
      if (e.num === response.subtask.num) return (submission.res[i].score = response.subtask.score);
    });

  if (response.tc)
    // Update Testcase
    submission.res.some(function (e, i) {
      if (e.num === response.tc.subtask) {
        const testCase = { ...response.tc };
        delete testCase.subtask;
        if (e.tcs) return submission.res[i].tcs.push(testCase);
        else return (submission.res[i].tcs = [testCase]);
      }
    });

  stmts.persist.run(toRow(submission));

  if (response.restype !== 5) return response;

  const problemName = submission.problem || submission.title;

  if (!isContest) {
    const difference = user.update(
      submission.user,
      problemName,
      response.totalscore,
      response.verdict,
    );
    problem.update(problemName, difference);
    return response;
  }

  entry.update(submission.user, submission.contest, problemName, response.totalscore);
  return response;
};
