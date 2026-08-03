module.exports = function (users) {
  let html = "";
  for (let a = 0; a < users.length; ++a) {
    html += "<tr>";
    for (let b = 0; b < 4 && a < users.length; ++a, ++b) {
      const name = encodeURI(users[a].username);
      html += "<td><a href='/users/" + name + "'>" + name + "</a></td>";
    }
    html += "</tr>\n";
  }
  return html;
};
