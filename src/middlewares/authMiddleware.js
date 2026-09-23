const { wantsJson, SESSION_EXPIRED } = require('../utils/wantsJson');

function authMiddleware(req, res, next) {
  if (!req.session.user) {
    if (wantsJson(req)) {
      return res.status(401).json({ error: SESSION_EXPIRED, login: '/users/login?expired=1' });
    }
    const original = req.originalUrl || '/products/checkout';
    const safeNext = req.method === 'GET' && !original.startsWith('/users/reservations/')
      ? original
      : (original.startsWith('/users/reservations') ? '/users/reservations' : '/users/profile');
    return res.redirect('/users/login?next=' + encodeURIComponent(safeNext));
  }
  next();
}

module.exports = authMiddleware;
