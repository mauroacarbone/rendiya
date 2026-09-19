const { isAdmin } = require('../utils/roles');

function adminMiddleware(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/users/login');
  }
  if (!isAdmin(req.session.user)) {
    return res.redirect('/users/profile');
  }
  next();
}

module.exports = adminMiddleware;
