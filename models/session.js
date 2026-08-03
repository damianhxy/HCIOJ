const Datastore = require("@seald-io/nedb");
const sessions = new Datastore({ filename: "./database/sessions", autoload: true });

exports.add = async function (user) {
  const session = await sessions.findOneAsync({ username: user });
  if (session)
    await sessions.updateAsync({ username: user }, { $set: { sessions: session.sessions + 1 } });
  else await sessions.insertAsync({ username: user, sessions: 1 });
};

exports.remove = async function (user) {
  const session = await sessions.findOneAsync({ username: user });
  if (!session) return;
  if (session.sessions > 1)
    await sessions.updateAsync({ username: user }, { $set: { sessions: session.sessions - 1 } });
  else await sessions.removeAsync({ username: user, sessions: 1 });
};

exports.all = async function () {
  return sessions.findAsync({});
};

exports.clear = async function () {
  await sessions.removeAsync({});
};
