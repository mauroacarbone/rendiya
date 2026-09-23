const { isAdmin } = require('../utils/roles');
const { wantsJson, SESSION_EXPIRED } = require('../utils/wantsJson');

function adminMiddleware(req, res, next) {
  if (!req.session.user) {
    if (wantsJson(req)) {
      return res.status(401).json({ error: SESSION_EXPIRED, login: '/users/login?expired=1' });
    }
    return res.redirect('/users/login');
  }
  if (!isAdmin(req.session.user)) {
    if (wantsJson(req)) {
      return res.status(403).json({ error: 'Solo administradores' });
    }
    return res.redirect('/users/profile');
  }
  next();
}

module.exports = adminMiddleware;
