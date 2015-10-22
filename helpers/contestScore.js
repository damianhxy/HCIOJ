var entry = require("../models/entry.js");

module.exports = function(awarded, title) {
    if (awarded && title in awarded)
        // return "<span class='label label-" + scoreColour(user.awarded[title]) + "'>" + user.awarded[title] + "</span>";
        return "<span class='score-" + awarded[title] + "'>" + awarded[title] + "</span>";
    return "<span>-</span>";
};