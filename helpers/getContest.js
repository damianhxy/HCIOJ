module.exports = function(contest) {
    if (contest === 0)
        return "<a href='/problems'>Practice Mode</a>";
    return "<a href='/contest/'" + contest + ">Contest #" + contest + "</a>";
};