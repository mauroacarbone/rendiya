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
const { seedIfEmpty } = require('./database/seed');
const mainRoutes = require('./routes/mainRoutes');
const productsRoutes = require('./routes/productsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const apiUsersRoutes = require('./routes/apiUsersRoutes');
const apiProductsRoutes = require('./routes/apiProductsRoutes');
const userLoggedMiddleware = require('./middlewares/userLoggedMiddleware');
const cors = require('./middlewares/cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
app.use('/api', cors);
app.use('/api/users', apiUsersRoutes);
app.use('/api/products', apiProductsRoutes);

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
  res.status(404).redirect('/');
});

db.sequelize.sync()
  .then(() => seedIfEmpty())
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`RendiYa en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo conectar la base de datos', error);
    process.exit(1);
  });
