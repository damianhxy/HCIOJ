const bcryptjs = require("bcryptjs");
const defaultAvatar =
  "https://s-media-cache-ak0.pinimg.com/236x/46/fa/7a/46fa7a12ed84713abfa2356a357650d1.jpg";
const Datastore = require("@seald-io/nedb");
const users = new Datastore({ filename: "./database/users", autoload: true });

exports.all = async function () {
  return users.findAsync({});
};

exports.authenticate = async function (username, password) {
  const user = await users.findOneAsync({ username: username });
  if (!user) throw new Error("Invalid username or password");
  const flag = await bcryptjs.compare(password, user.password);
  if (!flag) throw new Error("Invalid username or password");
  return user;
};

exports.create = async function (req, username, password) {
  username = username.toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    throw new Error(
      "Username must be 3-20 characters and contain only letters, numbers, and underscores",
    );
  if (password !== req.body.password2) throw new Error("Passwords Mismatch");
  const count = await users.countAsync({ username: username });
  if (count) throw new Error("Username in use: " + username);
  const hash = await bcryptjs.hash(password, 10);
  const user = {
    username: username,
    realname: req.body.realname,
    password: hash,
    email: req.body.email,
    level: req.body.level,
    admin: false,
    disabled: false,
    avatar: defaultAvatar,
    awarded: {},
    accepted: [],
    partial: [],
    failed: [],
    score: 0,
  };
  return users.insertAsync(user);
};

exports.get = async function (id) {
  return users.findOneAsync({ _id: id });
};

exports.update = async function (name, problem, score, verdict) {
  const user = await users.findOneAsync({ username: name });
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
  await users.updateAsync({ username: name }, { $set: user });
  return difference;
};
