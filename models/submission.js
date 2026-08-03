const Datastore = require("@seald-io/nedb");
const submissions = new Datastore({ filename: "./database/submissions", autoload: true });
const net = require("net");
const settings = require("../controllers/settings.js");
const user = require("./user.js");
const problem = require("./problem.js");
const entry = require("./entry.js");

exports.add = async function (submission) {
  return submissions.insertAsync(submission);
};

exports.all = async function () {
  const list = (await submissions.findAsync({})) || [];
  list.sort(function (a, b) {
    return a.numid - b.numid;
  });
  return list;
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

exports.get = async function (id) {
  return submissions.findOneAsync({ numid: id });
};

exports.getID = async function () {
  return submissions.countAsync({});
};

exports.update = async function (response) {
  const submission = await submissions.findOneAsync({ numid: response.subid });
  if (!submission) throw new Error("Submission not found");
  const isContest = submission.contest !== 0;
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
        delete response.tc.subtask;
        if (e.tcs) return submission.res[i].tcs.push(response.tc);
        else return (submission.res[i].tcs = [response.tc]);
      }
    });

  if (response.res_type !== 5) {
    await submissions.updateAsync({ numid: response.subid }, { $set: submission });
    return;
  }

  if (!isContest) {
    await submissions.updateAsync({ numid: response.subid }, { $set: submission });
    const difference = await user.update(
      response.user,
      response.problem,
      response.totalscore,
      response.verdict,
    );
    await problem.update(response.problem, difference);
    return;
  }

  await submissions.updateAsync({ numid: response.subid }, { $set: submission });
  await entry.update(response.user, submission.contest, response.problem, response.totalscore);
};
