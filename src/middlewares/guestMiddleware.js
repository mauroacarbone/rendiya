const { safeNext } = require('../utils/authRedirect');

function guestMiddleware(req, res, next) {
  if (req.session.user) {
    return res.redirect(safeNext(req.query.next || req.body.next));
  }
  next();
}

module.exports = guestMiddleware;
