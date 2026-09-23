const path = require('path');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../database/models');
const { isValidPhone } = require('../utils/phone');

function firstErrors(req) {
  const errors = {};
  if (req.fileValidationError) {
    errors[req.fileFieldError || 'image'] = req.fileValidationError;
  }
  validationResult(req).array({ onlyFirstError: true }).forEach((item) => {
    if (!errors[item.path]) {
      errors[item.path] = item.msg;
    }
  });
  return errors;
}

function imageFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk = ['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype);
  const extOk = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
  if (mimeOk && extOk) {
    return cb(null, true);
  }
  req.fileValidationError = 'La imagen debe ser JPG, JPEG, PNG o GIF.';
  cb(null, false);
}

const register = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Ingresá tu nombre.')
    .bail()
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres.'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Ingresá tu apellido.')
    .bail()
    .isLength({ min: 2 }).withMessage('El apellido debe tener al menos 2 caracteres.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Ingresá un email.')
    .bail()
    .isEmail().withMessage('El email no es válido.')
    .bail()
    .custom(async (email) => {
      const exists = await db.User.findOne({ where: { email } });
      if (exists) {
        throw new Error('Ya hay una cuenta con este email.');
      }
      return true;
    }),
  body('phone')
    .trim()
    .notEmpty().withMessage('Ingresá tu teléfono / WhatsApp.')
    .bail()
    .custom((value) => {
      if (!isValidPhone(value)) {
        throw new Error('Incluí el código de área. Ej: 11 1234-5678.');
      }
      return true;
    }),
  body('password')
    .notEmpty().withMessage('Ingresá una contraseña.')
    .bail()
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),
  body('passwordConfirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden.');
      }
      return true;
    }),
  body('image').custom((_, { req }) => {
    if (req.fileValidationError) {
      throw new Error(req.fileValidationError);
    }
    return true;
  })
];

const profile = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Ingresá tu nombre.')
    .bail()
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres.'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Ingresá tu apellido.')
    .bail()
    .isLength({ min: 2 }).withMessage('El apellido debe tener al menos 2 caracteres.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Ingresá un email.')
    .bail()
    .isEmail().withMessage('El email no es válido.'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Ingresá tu teléfono / WhatsApp.')
    .bail()
    .custom((value) => {
      if (!isValidPhone(value)) {
        throw new Error('Incluí el código de área. Ej: 11 1234-5678.');
      }
      return true;
    }),
  body('image').custom((_, { req }) => {
    if (req.fileValidationError) {
      throw new Error(req.fileValidationError);
    }
    return true;
  })
];

const login = [
  body('email')
    .trim()
    .notEmpty().withMessage('Ingresá un email.')
    .bail()
    .isEmail().withMessage('El email no es válido.'),
  body('password')
    .notEmpty().withMessage('Ingresá la contraseña.')
    .bail()
    .custom(async (password, { req }) => {
      const email = (req.body.email || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return true;
      }
      const stored = await db.User.findOne({ where: { email } });
      if (!stored || !bcrypt.compareSync(password, stored.password)) {
        throw new Error('Email o contraseña incorrectos.');
      }
      return true;
    })
];

const product = [
  body('name')
    .trim()
    .notEmpty().withMessage('Ingresá el nombre del vehículo.')
    .bail()
    .isLength({ min: 5 }).withMessage('El nombre debe tener al menos 5 caracteres.'),
  body('description')
    .trim()
    .notEmpty().withMessage('Ingresá una descripción.')
    .bail()
    .isLength({ min: 20 }).withMessage('La descripción debe tener al menos 20 caracteres.'),
  body('imageFile').custom((_, { req }) => {
    if (req.fileValidationError) {
      throw new Error(req.fileValidationError);
    }
    return true;
  }),
  body('productCategoryId').custom(async (value) => {
    const row = await db.ProductCategory.findByPk(Number(value));
    if (!row) {
      throw new Error('La categoría no es válida.');
    }
    return true;
  }),
  body('brandId').custom(async (value) => {
    const row = await db.Brand.findByPk(Number(value));
    if (!row) {
      throw new Error('La marca no es válida.');
    }
    return true;
  }),
  body('colorId').custom(async (value) => {
    const row = await db.Color.findByPk(Number(value));
    if (!row) {
      throw new Error('El color no es válido.');
    }
    return true;
  }),
  body('zoneId').custom(async (value) => {
    const row = await db.Zone.findByPk(Number(value));
    if (!row) {
      throw new Error('La zona no es válida.');
    }
    return true;
  })
];

const autoescuelaLead = [
  body('schoolName')
    .trim()
    .notEmpty().withMessage('Ingresá el nombre de la autoescuela.')
    .bail()
    .isLength({ min: 3, max: 120 }).withMessage('El nombre debe tener entre 3 y 120 caracteres.'),
  body('contactName')
    .trim()
    .notEmpty().withMessage('Ingresá el nombre de contacto.')
    .bail()
    .isLength({ min: 2, max: 120 }).withMessage('El nombre debe tener al menos 2 caracteres.'),
  body('email')
    .trim()
    .notEmpty().withMessage('Ingresá un email.')
    .bail()
    .isEmail().withMessage('El email no es válido.'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Ingresá el teléfono / WhatsApp.')
    .bail()
    .custom((value) => {
      if (!isValidPhone(value)) {
        throw new Error('Incluí el código de área. Ej: 11 1234-5678.');
      }
      return true;
    }),
  body('zone')
    .isIn(['CABA', 'GBA']).withMessage('Elegí la zona.'),
  body('neighborhood')
    .trim()
    .notEmpty().withMessage('Ingresá el barrio o localidad.')
    .bail()
    .isLength({ max: 80 }).withMessage('Máximo 80 caracteres.'),
  body('monthlyStudents')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 10000 }).withMessage('Ingresá un número entre 0 y 10000.'),
  body('fleetSize')
    .optional({ values: 'falsy' })
    .isInt({ min: 0, max: 1000 }).withMessage('Ingresá un número entre 0 y 1000.'),
  body('message')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 }).withMessage('El mensaje no puede superar los 1000 caracteres.')
];

module.exports = {
  firstErrors,
  imageFilter,
  register,
  login,
  profile,
  product,
  autoescuelaLead
};
