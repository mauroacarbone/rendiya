const bcrypt = require('bcryptjs');
const db = require('../database/models');
const { presentUser } = require('../database/presenters');
const { firstErrors } = require('../middlewares/validations');
const { ensureApiToken, listReservations, syncApiSession, updateReservation } = require('../services/rendiyaApi');
const { redirectAfterAuth } = require('../utils/authRedirect');

const THIRTY_DAYS = 1000 * 60 * 60 * 24 * 30;

async function findUserByEmail(email) {
  return db.User.findOne({
    where: { email },
    include: ['category']
  });
}

async function findUserById(id) {
  return db.User.findByPk(id, { include: ['category'] });
}

function login(req, res) {
  res.render('users/login', {
    title: 'Ingresar — RendiYa',
    errors: {},
    old: {},
    next: req.query.next || '/users/profile'
  });
}

async function processLogin(req, res) {
  const email = (req.body.email || '').trim();
  const errors = firstErrors(req);

  if (Object.keys(errors).length) {
    const mapped = errors.password && errors.password.indexOf('incorrectos') !== -1
      ? { credentials: errors.password }
      : errors;
    return res.render('users/login', {
      title: 'Ingresar — RendiYa',
      errors: mapped,
      old: { email },
      next: req.body.next || '/users/profile'
    });
  }

  const stored = await findUserByEmail(email);
  req.session.user = presentUser(stored);
  try {
    req.session.apiToken = await syncApiSession(email, req.body.password, `${stored.firstName} ${stored.lastName}`);
  } catch (error) {
    req.session.apiToken = null;
  }

  if (req.body.remember) {
    res.cookie('rememberEmail', stored.email, { maxAge: THIRTY_DAYS });
  } else {
    res.clearCookie('rememberEmail');
  }

  return redirectAfterAuth(req, res, '/users/profile');
}

function register(req, res) {
  res.render('users/register', {
    title: 'Crear cuenta — RendiYa',
    errors: {},
    old: {}
  });
}

async function processRegister(req, res) {
  const firstName = (req.body.firstName || '').trim();
  const lastName = (req.body.lastName || '').trim();
  const email = (req.body.email || '').trim();
  const categoryName = req.body.category === 'instructor' ? 'instructor' : 'client';
  const errors = firstErrors(req);

  if (Object.keys(errors).length) {
    return res.render('users/register', {
      title: 'Crear cuenta — RendiYa',
      errors,
      old: { firstName, lastName, email, category: categoryName }
    });
  }

  const userCategory = await db.UserCategory.findOne({ where: { name: categoryName } })
    || await db.UserCategory.findOne({ where: { name: 'client' } });

  const user = await db.User.create({
    firstName,
    lastName,
    email,
    password: bcrypt.hashSync(req.body.password, 10),
    image: req.file ? '/images/users/' + req.file.filename : '/images/favicon.png',
    userCategoryId: userCategory.id
  });

  const created = await findUserById(user.id);
  req.session.user = presentUser(created);
  try {
    req.session.apiToken = await syncApiSession(email, req.body.password, `${created.firstName} ${created.lastName}`);
  } catch (error) {
    req.session.apiToken = null;
  }
  return redirectAfterAuth(req, res, '/users/profile');
}

async function list(req, res) {
  const rows = await db.User.findAll({ include: ['category'], order: [['id', 'ASC']] });
  res.render('users/userList', {
    title: 'Usuarios — RendiYa',
    users: rows.map(presentUser)
  });
}

const STATUS_LABEL = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada'
};

function isCancelledStatus(status) {
  return /^(cancelled|canceled|cancelada)$/i.test(String(status || '').trim());
}

function reservationNotice(req) {
  const notices = {
    confirmado: {
      title: 'Turno confirmado',
      text: 'La reserva quedó efectiva.',
      icon: 'success'
    },
    cancelado: {
      title: 'Cancelamos la reserva',
      text: 'La sacamos de tu lista.',
      icon: 'success'
    },
    error: {
      title: 'No se pudo actualizar',
      text: 'Intentá de nuevo en un momento.',
      icon: 'warning'
    }
  };
  const fromFlash = req.session.flashNotice;
  if (fromFlash) {
    delete req.session.flashNotice;
  }
  const aviso = String(req.query.aviso || '');
  const key = req.query.cancelled === '1' || fromFlash === 'cancelado'
    ? 'cancelado'
    : (aviso || fromFlash);
  return notices[key] || null;
}

function redirectReservations(req, res, query, flash) {
  req.session.flashNotice = flash;
  const finish = () => res.redirect(`/users/reservations?${query}`);
  if (typeof req.session.save === 'function') {
    return req.session.save(() => finish());
  }
  return finish();
}

async function reservations(req, res) {
  let items = [];
  let error = null;
  const notice = reservationNotice(req);

  if (!req.session.user) {
    error = 'Volvé a iniciar sesión para ver tus turnos.';
  } else {
    try {
      const token = await ensureApiToken(req.session);
      items = (await listReservations(token)).filter((item) => !isCancelledStatus(item.status));
    } catch (err) {
      error = err.message || 'No se pudieron cargar las reservas. Intentá de nuevo en unos minutos.';
    }
  }

  res.render('users/reservations', {
    title: 'Mis reservas — RendiYa',
    reservations: items,
    statusLabel: STATUS_LABEL,
    error,
    notice
  });
}

async function changeReservationStatus(req, res, status, aviso) {
  if (!req.session.user) {
    return res.redirect('/users/login?next=' + encodeURIComponent('/users/reservations'));
  }
  try {
    const token = await ensureApiToken(req.session);
    if (!token) {
      return redirectReservations(req, res, 'aviso=error', 'error');
    }
    await updateReservation(token, req.params.id, { status });
    if (aviso === 'cancelado') {
      return redirectReservations(req, res, 'cancelled=1', 'cancelado');
    }
    return redirectReservations(req, res, `aviso=${aviso}`, aviso);
  } catch (error) {
    return redirectReservations(req, res, 'aviso=error', 'error');
  }
}

function confirmReservation(req, res) {
  return changeReservationStatus(req, res, 'confirmed', 'confirmado');
}

function cancelReservation(req, res) {
  return changeReservationStatus(req, res, 'cancelled', 'cancelado');
}

async function profile(req, res) {
  const row = await findUserById(req.session.user.id);
  req.session.user = presentUser(row);
  res.render('users/profile', {
    title: 'Mi perfil — RendiYa',
    profileUser: presentUser(row)
  });
}

async function detail(req, res) {
  const row = await findUserById(req.params.id);
  if (!row) {
    return res.redirect('/users/profile');
  }
  const isOwn = req.session.user.id === row.id;
  const isAdminUser = req.session.user.category === 'admin';
  if (!isOwn && !isAdminUser) {
    return res.redirect('/users/profile');
  }
  res.render('users/userDetail', {
    title: `${row.firstName} — RendiYa`,
    profileUser: presentUser(row)
  });
}

async function edit(req, res) {
  const row = await findUserById(req.params.id);
  if (!row) {
    return res.redirect('/users/profile');
  }
  const isOwn = req.session.user.id === row.id;
  const isAdmin = req.session.user.category === 'admin';
  if (!isOwn && !isAdmin) {
    return res.redirect('/users/profile');
  }
  const categories = await db.UserCategory.findAll({ order: [['id', 'ASC']] });
  res.render('users/userEdit', {
    title: 'Editar perfil — RendiYa',
    profileUser: presentUser(row),
    userCategories: categories.map((item) => item.get({ plain: true }))
  });
}

async function update(req, res) {
  const row = await findUserById(req.params.id);
  if (!row) {
    return res.redirect('/users/profile');
  }
  const isOwn = req.session.user.id === row.id;
  const isAdmin = req.session.user.category === 'admin';
  if (!isOwn && !isAdmin) {
    return res.redirect('/users/profile');
  }

  const firstName = (req.body.firstName || '').trim();
  const lastName = (req.body.lastName || '').trim();
  const email = (req.body.email || '').trim();
  let userCategoryId = row.userCategoryId;
  if (isAdmin && req.body.userCategoryId) {
    userCategoryId = Number(req.body.userCategoryId);
  }

  const data = {
    firstName: firstName || row.firstName,
    lastName: lastName || row.lastName,
    email: email || row.email,
    userCategoryId
  };

  if (req.file) {
    data.image = '/images/users/' + req.file.filename;
  }
  if (req.body.password && req.body.password.length >= 8) {
    data.password = bcrypt.hashSync(req.body.password, 10);
  }

  await row.update(data);
  const updated = await findUserById(row.id);
  if (isOwn) {
    req.session.user = presentUser(updated);
  }
  return res.redirect('/users/' + row.id);
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('rememberEmail');
    res.redirect('/');
  });
}

module.exports = {
  login,
  processLogin,
  register,
  processRegister,
  list,
  profile,
  reservations,
  confirmReservation,
  cancelReservation,
  detail,
  edit,
  update,
  logout
};
