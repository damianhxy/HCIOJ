module.exports = function (user, title) {
  if (user && title in user.awarded)
    // return "<span class='label label-" + scoreColour(user.awarded[title]) + "'>" + user.awarded[title] + "</span>";
    return "<span class='score-" + user.awarded[title] + "'>" + user.awarded[title] + "</span>";
  return "<span>0</span>";
};
