const { wantsJson, SESSION_EXPIRED, RESERVATION_AUTH } = require('../utils/wantsJson');

function isReservationPath(url) {
  const path = String(url || '').split('?')[0];
  return /\/(checkout|pago|reservar)(\/|$)/.test(path);
}

function authMiddleware(req, res, next) {
  if (!req.session.user) {
    const original = req.originalUrl || '/products/checkout';
    if (wantsJson(req)) {
      const error = isReservationPath(original) ? RESERVATION_AUTH : SESSION_EXPIRED;
      return res.status(401).json({ error, login: '/users/login?expired=1' });
    }
    const safeNext = isReservationPath(original)
      ? '/reservar'
      : (req.method === 'GET' && !original.startsWith('/users/reservations/')
        ? original
        : (original.startsWith('/users/reservations') ? '/users/reservations' : '/users/profile'));
    return res.redirect('/users/login?redirect=' + encodeURIComponent(safeNext));
  }
  next();
}

module.exports = authMiddleware;
