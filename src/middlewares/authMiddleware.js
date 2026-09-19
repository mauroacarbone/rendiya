function authMiddleware(req, res, next) {
  if (!req.session.user) {
    const original = req.originalUrl || '/products/checkout';
    const safeNext = req.method === 'GET' && !original.startsWith('/users/reservations/')
      ? original
      : (original.startsWith('/users/reservations') ? '/users/reservations' : '/users/profile');
    return res.redirect('/users/login?next=' + encodeURIComponent(safeNext));
  }
  next();
}

module.exports = authMiddleware;
