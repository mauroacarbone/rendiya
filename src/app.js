const express = require('express');
const path = require('path');
const fs = require('fs');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && process.env[match[1].trim()] === undefined) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const db = require('./database/models');
const { seedIfEmpty, ensureDemoAccounts, ensureAutoescuelas } = require('./database/seed');
const { ensureProductVenue, ensureUserPhone, ensureAutoescuelaColumns } = require('./database/migrate');
const { formatLocal, displayPhone } = require('./utils/phone');
const { ensureVenues } = require('./services/venues');
const mainRoutes = require('./routes/mainRoutes');
const productsRoutes = require('./routes/productsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const quizRoutes = require('./routes/quizRoutes');
const autoescuelasRoutes = require('./routes/autoescuelasRoutes');
const apiUsersRoutes = require('./routes/apiUsersRoutes');
const apiProductsRoutes = require('./routes/apiProductsRoutes');
const apiAutoescuelasRoutes = require('./routes/apiAutoescuelasRoutes');
const apiAdminRoutes = require('./routes/apiAdminRoutes');
const userLoggedMiddleware = require('./middlewares/userLoggedMiddleware');
const cors = require('./middlewares/cors');
const { wantsJson } = require('./utils/wantsJson');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.phoneInputValue = formatLocal;
app.locals.displayPhone = displayPhone;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'rendiya-secret',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === '1' || process.env.RENDER === 'true',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  return userLoggedMiddleware(req, res, next);
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/', mainRoutes);
app.use('/products', productsRoutes);
app.use('/users', usersRoutes);
app.use('/simulador', quizRoutes);
app.use('/autoescuelas', autoescuelasRoutes);
app.use('/api', cors);
app.use('/api/users', apiUsersRoutes);
app.use('/api/products', apiProductsRoutes);
app.use('/api/autoescuelas', apiAutoescuelasRoutes);
app.use('/api/admin', apiAdminRoutes);

const centralDir = path.join(__dirname, '..', 'dashboard', 'dist');
app.use('/central', express.static(centralDir));
app.use('/central', (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  res.sendFile(path.join(centralDir, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use((req, res) => {
  if (wantsJson(req)) {
    return res.status(404).json({ error: 'Recurso no encontrado' });
  }
  res.status(404).redirect('/');
});

app.use((error, req, res, next) => {
  const status = error.status || error.statusCode || 500;
  console.error(`[error] ${req.method} ${req.originalUrl} → ${status}:`, error);
  if (res.headersSent) {
    return res.end();
  }
  // JSON limpio para XHR, Accept de datos, /api y el PDF del voucher.
  // Una vista HTML acá haría que fetch pinte el markup en la interfaz.
  if (wantsJson(req)) {
    const raw = status === 400 && error.type === 'entity.parse.failed'
      ? 'El cuerpo de la petición no es JSON válido'
      : (status >= 500 ? 'Error interno del servidor' : (error.message || 'Error del servidor'));
    const message = /<!doctype|<html|<\/?[a-z][\s\S]*>/i.test(String(raw))
      ? 'Error del servidor'
      : raw;
    return res.status(status).json({ error: message });
  }
  res.status(status).send('Ocurrió un error. Volvé a intentar en unos minutos.');
});

db.sequelize.sync()
  .then(() => ensureVenues())
  .then(() => ensureUserPhone())
  .then(() => ensureAutoescuelaColumns())
  .then(() => seedIfEmpty())
  .then(() => ensureDemoAccounts())
  .then(() => ensureAutoescuelas())
  .then(() => ensureProductVenue())
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`RendiYa en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo conectar la base de datos', error);
    process.exit(1);
  });
