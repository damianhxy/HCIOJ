module.exports = function (mask) {
  if (!mask) return "<span>Normal</span>";
  let html = "";
  if (mask & (1 << 0)) html += "<span>TLE</span>";
  if (mask & (1 << 1)) html += "<span>MLE</span>";
  if (mask & (1 << 2)) html += "<span>Killed</span>";
  return html;
};
