const { requestedNext } = require('../utils/authRedirect');

function guestMiddleware(req, res, next) {
  if (req.session.user) {
    return res.redirect(requestedNext(req));
  }
  next();
}

module.exports = guestMiddleware;
