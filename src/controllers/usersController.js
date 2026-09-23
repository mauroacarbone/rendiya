const bcrypt = require('bcryptjs');
const db = require('../database/models');
const { presentUser } = require('../database/presenters');
const { firstErrors } = require('../middlewares/validations');
const { ensureApiToken, withApiToken, listReservations, syncApiSession, updateReservation, syncStorefrontUser } = require('../services/rendiyaApi');
const { redirectAfterAuth, requestedNext } = require('../utils/authRedirect');
const { ensureVenues, primaryVenueForZone } = require('../services/venues');
const { normalizePhone } = require('../utils/phone');
const { buildVoucherPdf } = require('../services/voucherPdf');
const { SESSION_EXPIRED } = require('../utils/wantsJson');

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
    next: requestedNext(req),
    expired: req.query.expired === '1'
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
      next: requestedNext(req)
    });
  }

  const stored = await findUserByEmail(email);
  req.session.user = presentUser(stored);
  try {
    req.session.apiToken = await syncApiSession(
      email,
      req.body.password,
      `${stored.firstName} ${stored.lastName}`,
      stored.phone
    );
  } catch (error) {
    try {
      req.session.apiToken = await ensureApiToken(req.session);
    } catch {
      req.session.apiToken = null;
    }
  }
  if (stored.phone) {
    await syncStorefrontUser(req.session);
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
    old: {},
    next: requestedNext(req)
  });
}

async function processRegister(req, res) {
  const firstName = (req.body.firstName || '').trim();
  const lastName = (req.body.lastName || '').trim();
  const email = (req.body.email || '').trim();
  const phone = normalizePhone(req.body.phone);
  const categoryName = req.body.category === 'instructor' ? 'instructor' : 'client';
  const errors = firstErrors(req);

  if (Object.keys(errors).length) {
    return res.render('users/register', {
      title: 'Crear cuenta — RendiYa',
      errors,
      old: { firstName, lastName, email, phone: req.body.phone, category: categoryName },
      next: requestedNext(req)
    });
  }

  const userCategory = await db.UserCategory.findOne({ where: { name: categoryName } })
    || await db.UserCategory.findOne({ where: { name: 'client' } });

  const user = await db.User.create({
    firstName,
    lastName,
    email,
    phone,
    password: bcrypt.hashSync(req.body.password, 10),
    image: req.file ? '/images/users/' + req.file.filename : '/images/favicon.png',
    userCategoryId: userCategory.id
  });

  const created = await findUserById(user.id);
  req.session.user = presentUser(created);
  try {
    req.session.apiToken = await syncApiSession(
      email,
      req.body.password,
      `${created.firstName} ${created.lastName}`,
      created.phone
    );
  } catch (error) {
    try {
      req.session.apiToken = await ensureApiToken(req.session);
    } catch {
      req.session.apiToken = null;
    }
  }
  if (created.phone) {
    await syncStorefrontUser(req.session);
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

function consumeFlashNotice(req) {
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
    },
    perfil_guardado: {
      title: 'Perfil actualizado',
      text: 'Los cambios se guardaron correctamente.',
      icon: 'success'
    },
    cliente_guardado: {
      title: 'Cliente actualizado',
      text: 'Los cambios se guardaron correctamente.',
      icon: 'success'
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

function redirectWithNotice(req, res, url, flash) {
  req.session.flashNotice = flash;
  const finish = () => res.redirect(url);
  if (typeof req.session.save === 'function') {
    return req.session.save(() => finish());
  }
  return finish();
}

function redirectReservations(req, res, query, flash) {
  return redirectWithNotice(req, res, `/users/reservations?${query}`, flash);
}

async function reservations(req, res) {
  let items = [];
  let error = null;
  let waking = false;
  const notice = consumeFlashNotice(req);
  await ensureVenues();

  if (!req.session.user) {
    error = 'Volvé a iniciar sesión para ver tus turnos.';
  } else {
    try {
      const itemsRaw = await withApiToken(req.session, (token) => listReservations(token));
      items = itemsRaw.filter((item) => !isCancelledStatus(item.status));
    } catch (err) {
      waking = Boolean(err.coldStart);
      error = err.message || 'No se pudieron cargar las reservas. Intentá de nuevo en unos minutos.';
    }
  }

  res.render('users/reservations', {
    title: 'Mis reservas — RendiYa',
    reservations: items,
    statusLabel: STATUS_LABEL,
    error,
    waking,
    notice,
    liveApiUrl: (process.env.RENDIYA_API_URL || 'http://localhost:3001').replace(/\/$/, ''),
    liveSocketToken: req.session.apiToken || '',
    examCenter: primaryVenueForZone('CABA')
  });
}

async function changeReservationStatus(req, res, status, aviso) {
  if (!req.session.user) {
    return res.redirect('/users/login?next=' + encodeURIComponent('/users/reservations'));
  }
  try {
    await withApiToken(req.session, (token) => updateReservation(token, req.params.id, { status }));
    if (aviso === 'cancelado') {
      return redirectReservations(req, res, 'cancelled=1', 'cancelado');
    }
    return redirectReservations(req, res, `aviso=${aviso}`, aviso);
  } catch (error) {
    return redirectReservations(req, res, 'aviso=error', 'error');
  }
}

async function reservationVoucher(req, res) {
  const id = String(req.params.id);
  if (!req.session.user) {
    return res.status(401).json({ error: SESSION_EXPIRED, login: '/users/login?expired=1' });
  }

  let reservation;
  try {
    const items = await withApiToken(req.session, (token) => listReservations(token));
    reservation = items.find((item) => String(item.id) === id);
  } catch (err) {
    console.error(`[voucher] No se pudieron leer las reservas (reserva ${id}, usuario ${req.session.user.id}):`, err);
    return res.status(502).json({ error: err.message || 'No se pudo consultar la reserva. Intentá de nuevo en unos minutos.' });
  }

  if (!reservation) {
    return res.status(404).json({ error: 'No encontramos esa reserva en tu cuenta.' });
  }
  if (String(reservation.status || '').toLowerCase() !== 'confirmed') {
    return res.status(409).json({ error: 'El voucher está disponible solo para turnos confirmados.' });
  }

  try {
    await ensureVenues();
    const venue = reservation.venue || primaryVenueForZone('CABA');
    const pdf = await buildVoucherPdf(reservation, venue);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="voucher-reserva-${reservation.id}.pdf"`,
      'Content-Length': pdf.length,
      'Cache-Control': 'no-store'
    });
    return res.send(pdf);
  } catch (err) {
    console.error(`[voucher] Falló la generación del PDF (reserva ${id}):`, err, { reservation });
    return res.status(500).json({ error: 'No se pudo generar el PDF del voucher.' });
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
    profileUser: presentUser(row),
    notice: consumeFlashNotice(req)
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
    userCategories: categories.map((item) => item.get({ plain: true })),
    errors: {}
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
  const phone = normalizePhone(req.body.phone);
  let userCategoryId = row.userCategoryId;
  if (isAdmin && req.body.userCategoryId) {
    userCategoryId = Number(req.body.userCategoryId);
  }

  const errors = firstErrors(req);
  if (Object.keys(errors).length) {
    const categories = await db.UserCategory.findAll({ order: [['id', 'ASC']] });
    return res.render('users/userEdit', {
      title: 'Editar perfil — RendiYa',
      profileUser: {
        ...presentUser(row),
        firstName: firstName || row.firstName,
        lastName: lastName || row.lastName,
        email: email || row.email,
        phone: req.body.phone || row.phone
      },
      userCategories: categories.map((item) => item.get({ plain: true })),
      errors
    });
  }

  const data = {
    firstName: firstName || row.firstName,
    lastName: lastName || row.lastName,
    email: email || row.email,
    phone: phone || row.phone,
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
    await syncStorefrontUser(req.session);
  }
  return redirectWithNotice(
    req,
    res,
    '/users/' + row.id,
    isOwn ? 'perfil_guardado' : 'cliente_guardado'
  );
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
  reservationVoucher,
  confirmReservation,
  cancelReservation,
  detail,
  edit,
  update,
  logout
};
