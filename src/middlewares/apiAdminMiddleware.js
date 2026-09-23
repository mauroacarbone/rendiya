const db = require('../database/models');
const { presentUser } = require('../database/presenters');
const { isAdmin } = require('../utils/roles');
const { SESSION_EXPIRED } = require('../utils/wantsJson');

/**
 * Las rutas `/api` no pasan por `userLoggedMiddleware`, así que acá se
 * recupera la sesión desde la cookie "recordarme" y se responde en JSON en
 * lugar de redirigir al login.
 */
async function apiAdminMiddleware(req, res, next) {
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
    if (!req.session.user) {
      return res.status(401).json({ error: SESSION_EXPIRED, login: '/users/login?expired=1' });
    }
    if (!isAdmin(req.session.user)) {
      return res.status(403).json({ error: 'Solo administradores' });
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = apiAdminMiddleware;
