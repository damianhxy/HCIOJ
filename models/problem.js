const Datastore = require("@seald-io/nedb");
const problems = new Datastore({ filename: "./database/problems", autoload: true });

exports.add = async function (problemObject) {
  return problems.insertAsync(problemObject);
};

exports.all = async function () {
  return problems.findAsync({});
};

exports.get = async function (name) {
  return problems.findOneAsync({ title: name });
};

exports.getProblems = async function (array) {
  return problems.findAsync({ title: { $in: array } });
};

exports.update = async function (name, amt) {
  const problem = await problems.findOneAsync({ title: name });
  if (!problem) throw new Error("Problem not found");
  await problems.updateAsync({ title: name }, { $set: { awarded: (problem.awarded || 0) + amt } });
  return "Problem updated.";
};
