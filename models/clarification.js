const Datastore = require("@seald-io/nedb");
const clarifications = new Datastore({ filename: "./database/clarifications", autoload: true });

exports.add = async function (clarification) {
  return clarifications.insertAsync(clarification);
};

exports.all = async function () {
  return (await clarifications.findAsync({})) || [];
};

exports.getID = async function () {
  return clarifications.countAsync({});
};

exports.edit = async function (id, newClarification) {
  return clarifications.updateAsync({ id: id }, { $set: newClarification });
};

exports.getClars = async function (contest) {
  return clarifications.findAsync({ contest: contest });
};
