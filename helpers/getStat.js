module.exports = function(mask) {
    if (!mask)
        return "<span class='label label-success'>Normal</span>";
    var html = "";
    if (mask & (1 << 0))
        html += "<span class='label label-danger'>TLE</span>";
    if (mask & (1 << 1))
        html += "<span class='label label-danger'>MLE</span>";
    if (mask & (1 << 2))
        html += "<span class='label label-danger'>Killed</span>";
    return html;
};