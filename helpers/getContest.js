module.exports = function (contest) {
  // Practice submissions store contest "0" (a number before the SQLite migration).
  if (String(contest) === "0") return "<a href='/problems'>Practice Mode</a>";
  const id = encodeURIComponent(contest);
  return "<a href='/contests/" + id + "'>Contest #" + id + "</a>";
};
