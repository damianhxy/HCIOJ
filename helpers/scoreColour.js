module.exports = function (score) {
  if (score === 0) return "danger";
  if (score === 100) return "success";
  return "warning";
};
