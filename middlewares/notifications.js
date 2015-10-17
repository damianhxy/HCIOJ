module.exports = function(req, res, next) {
    var err = req.session.error;
    var success = req.session.success;

    delete req.session.error;
    delete req.session.success;

    if (err) res.locals.error = err;
    if (success) res.locals.success = success;

    next();
}