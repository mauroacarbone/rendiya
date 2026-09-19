function safeNext(value, fallback = '/users/profile') {
  if (typeof value !== 'string') return fallback;
  const next = value.trim();
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/users/login') || next.startsWith('/users/register')) {
    return fallback;
  }
  return next;
}

function redirectAfterAuth(req, res, fallback) {
  const next = safeNext(req.body.next || req.query.next, fallback);
  const finish = () => res.redirect(next);
  if (typeof req.session.save === 'function') {
    return req.session.save((error) => {
      if (error) {
        return res.redirect(fallback);
      }
      finish();
    });
  }
  return finish();
}

module.exports = { safeNext, redirectAfterAuth };
