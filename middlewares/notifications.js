module.exports = function (req, res, next) {
  const err = req.session.error;
  const success = req.session.success;

  delete req.session.error;
  delete req.session.success;

  if (err) res.locals.error = err;
  if (success) res.locals.success = success;

  next();
};
