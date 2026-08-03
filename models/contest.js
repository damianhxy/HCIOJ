const Datastore = require("@seald-io/nedb");
const contests = new Datastore({ filename: "./database/contests", autoload: true });

exports.add = async function (contest) {
  return contests.insertAsync(contest);
};

exports.all = async function () {
  return (await contests.findAsync({})) || [];
};

exports.get = async function (id) {
  return contests.findOneAsync({ id: id });
};

exports.getID = async function () {
  return contests.countAsync({}) + 1;
};

exports.edit = async function (id, newContest) {
  await contests.updateAsync({ id: id }, { $set: newContest });
  return "Edited contest";
};
