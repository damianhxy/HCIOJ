module.exports = function (req, res, next) {
  if (req.isAuthenticated() && req.user.admin) return next();
  req.session.error = "Unauthorised";
  res.status(401).redirect(req.headers.referer || "/");
};
