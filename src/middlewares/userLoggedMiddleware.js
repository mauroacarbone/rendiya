const db = require('../database/models');
const { presentUser } = require('../database/presenters');

const { isAdmin } = require('../utils/roles');

async function userLoggedMiddleware(req, res, next) {
  try {
    if (!req.session.user && req.cookies.rememberEmail) {
      const stored = await db.User.findOne({
        where: { email: req.cookies.rememberEmail },
        include: ['category']
      });
      if (stored) {
        req.session.user = presentUser(stored);
      }
    }
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = isAdmin(req.session.user);
    res.locals.dashboardUrl = (() => {
      const base = process.env.DASHBOARD_URL || 'http://localhost:5173';
      const token = req.session.apiToken;
      if (!token) return base;
      try {
        const url = new URL(base);
        url.searchParams.set('token', token);
        return url.toString();
      } catch {
        const join = base.includes('?') ? '&' : '?';
        return `${base}${join}token=${encodeURIComponent(token)}`;
      }
    })();
    res.locals.reservationsUrl = '/users/reservations';
    res.locals.googleMapsKey = process.env.GOOGLE_MAPS_API_KEY || '';
    res.locals.whatsappPhone = (process.env.WHATSAPP_PHONE || '5491130000000').replace(/\D/g, '');
    res.locals.cartCount = req.session.booking && req.session.booking.productId ? 1 : 0;
    res.locals.currentPath = req.originalUrl || req.path;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = userLoggedMiddleware;
