var entry = require("../models/entry.js");

module.exports = function(entry, title) {
    if (entry && title in entry.awarded)
        // return "<span class='label label-" + scoreColour(user.awarded[title]) + "'>" + user.awarded[title] + "</span>";
        return "<span class='score-" + entry.awarded[title] + "'>" + entry.awarded[title] + "</span>";
    return "<span>0</span>";
};