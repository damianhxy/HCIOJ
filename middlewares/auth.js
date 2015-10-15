module.exports = function(req, res, next) {
    if (req.isAuthenticated())
        return next();
    req.session.error = "Please log in";
    res.status(401).redirect(req.headers.referrer || "/");
};