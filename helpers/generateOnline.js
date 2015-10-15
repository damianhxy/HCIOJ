module.exports = function(users) {
    var html = "";
    for (var a = 0; a < users.length; ++a) {
        html += "<tr>";
        for (var b = 0; b < 4 && a < users.length; ++a, ++b) {
            var name = encodeURI(users[a].username);
            html += "<td><a href='/users/" + name + "'>" + name + "</a></td>";
        }
        html += "</tr>\n";
    }
    return html;
};