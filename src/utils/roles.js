function isAdmin(user) {
  return Boolean(user && String(user.category).toLowerCase() === 'admin');
}

module.exports = { isAdmin };
