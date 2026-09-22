const { Op } = require('sequelize');
const db = require('../database/models');
const { presentProduct, productInclude } = require('../database/presenters');
const { firstErrors } = require('../middlewares/validations');
const { createReservation, withApiToken } = require('../services/rendiyaApi');
const { bookingTotals, INSTRUCTOR_FEE } = require('../services/taxiTariff');
const { examCenterForZone } = require('../services/examCenters');
const { drivingDistanceKm } = require('../services/mapsRoute');
const { PAYMENT_METHODS, parsePayment } = require('../services/payment');

function checkoutLocals({ product, booking, totals, error }) {
  return {
    title: 'Confirmar reserva — RendiYa',
    product,
    booking,
    totals,
    error: error || null,
    examCenter: examCenterForZone(product && product.zone),
    googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || '',
    paymentMethods: PAYMENT_METHODS
  };
}

function parseFlag(query, key, fallback, submitted) {
  if (Object.prototype.hasOwnProperty.call(query, key)) {
    const value = query[key];
    const raw = Array.isArray(value) ? value[value.length - 1] : value;
    return raw === '1' || raw === 'on' || raw === 'true';
  }
  if (submitted) return false;
  return fallback;
}

function imageFromRequest(req, currentImage) {
  if (req.file) {
    return '/images/' + req.file.filename;
  }
  if (req.body.image && req.body.image.trim()) {
    return req.body.image.trim();
  }
  return currentImage || '/images/etios.jpg';
}

async function catalogs() {
  const [categories, brands, colors, zones] = await Promise.all([
    db.ProductCategory.findAll({ order: [['name', 'ASC']] }),
    db.Brand.findAll({ order: [['name', 'ASC']] }),
    db.Color.findAll({ order: [['name', 'ASC']] }),
    db.Zone.findAll({ order: [['name', 'ASC']] })
  ]);
  return {
    productCategories: categories.map((row) => row.get({ plain: true })),
    brands: brands.map((row) => row.get({ plain: true })),
    colors: colors.map((row) => row.get({ plain: true })),
    zones: zones.map((row) => row.get({ plain: true }))
  };
}

async function payloadFromBody(req, current) {
  const productCategoryId = Number(req.body.productCategoryId) || (current && current.productCategoryId) || 1;
  const category = await db.ProductCategory.findByPk(productCategoryId);
  const isMoto = category && category.name === 'Moto';

  return {
    name: req.body.name,
    description: req.body.description,
    image: imageFromRequest(req, current && current.image),
    price: Number(req.body.price) || 0,
    productCategoryId,
    brandId: Number(req.body.brandId) || (current && current.brandId) || 1,
    colorId: Number(req.body.colorId) || (current && current.colorId) || 1,
    zoneId: Number(req.body.zoneId) || (current && current.zoneId) || 1,
    transmission: req.body.transmission || (current && current.transmission) || 'Manual',
    license: isMoto ? 'Clase A' : 'Clase B',
    vtv: true,
    insurance: true
  };
}

const productsController = {
  list: async (req, res) => {
    const { category, zone, q } = req.query;
    const where = {};
    const include = productInclude.map((item) => ({ ...item }));

    if (q) {
      where.name = { [Op.like]: '%' + q + '%' };
    }
    if (category) {
      include[0] = { association: 'category', where: { name: category }, required: true };
    }
    if (zone) {
      include[3] = { association: 'zone', where: { name: zone }, required: true };
    }

    const rows = await db.Product.findAll({ where, include, order: [['id', 'ASC']] });
    if (req.query.fecha) {
      req.session.preferredDate = req.query.fecha;
    }
    const products = rows.map(presentProduct).filter((item) => !/test/i.test(item.name));
    res.render('products/productList', {
      title: 'Catálogo — RendiYa',
      products,
      category: category || '',
      zone: zone || '',
      q: q || ''
    });
  },

  detail: async (req, res) => {
    const row = await db.Product.findByPk(req.params.id, { include: productInclude });
    if (!row) {
      return res.redirect('/products');
    }
    res.render('products/productDetail', {
      title: `${row.name} — RendiYa`,
      product: presentProduct(row)
    });
  },

  cart: async (req, res) => {
    if (req.query.clear) {
      req.session.booking = null;
      return res.redirect('/products/cart');
    }

    const productId = req.query.id || (req.session.booking && req.session.booking.productId);
    if (!productId) {
      return res.render('products/productCart', {
        title: 'Carrito — RendiYa',
        product: null,
        instructor: false,
        pickup: false,
        booking: null,
        totals: bookingTotals({})
      });
    }

    const row = await db.Product.findByPk(productId, { include: productInclude });
    const product = presentProduct(row);
    if (!product) {
      req.session.booking = null;
      return res.redirect('/products/cart');
    }

    const submitted = Boolean(req.query.id);
    const previous = req.session.booking || {};
    const instructor = parseFlag(req.query, 'instructor', Boolean(previous.instructor), submitted);
    const pickup = instructor && parseFlag(req.query, 'pickup', Boolean(previous.pickup), submitted);
    const defaultKm = product.zone === 'GBA' ? 14 : 5;
    const pickupKm = Math.min(80, Math.max(1, Number(req.query.pickup_km || previous.pickupKm || defaultKm) || defaultKm));
    const pickupAddress = String(req.query.pickup_address || previous.pickupAddress || '').trim();
    const date = req.query.fecha || previous.date || req.session.preferredDate || '';
    const time_slot = req.query.franja || previous.time_slot || '08:00 – 11:00';
    const outsideCity = product.zone === 'GBA';
    const totals = bookingTotals({
      productPrice: product.price,
      instructor,
      pickup,
      pickupKm,
      outsideCity,
      timeSlot: time_slot
    });

    req.session.booking = {
      productId: product.id,
      date,
      time_slot,
      instructor,
      pickup,
      pickupKm,
      pickupAddress,
      outsideCity
    };
    res.locals.cartCount = 1;
    res.render('products/productCart', {
      title: 'Carrito — RendiYa',
      product,
      instructor,
      pickup,
      pickupKm,
      pickupAddress,
      booking: req.session.booking,
      totals,
      instructorFee: INSTRUCTOR_FEE
    });
  },

  checkout: async (req, res) => {
    const booking = {
      ...(req.session.booking || {}),
      date: (req.session.booking && req.session.booking.date) || req.session.preferredDate || ''
    };
    const row = booking.productId
      ? await db.Product.findByPk(booking.productId, { include: productInclude })
      : null;
    const product = presentProduct(row);
    const totals = bookingTotals({
      productPrice: product && product.price,
      instructor: Boolean(booking.instructor),
      pickup: Boolean(booking.pickup),
      pickupKm: booking.pickupKm,
      outsideCity: Boolean(booking.outsideCity || (product && product.zone === 'GBA')),
      timeSlot: booking.time_slot
    });
    res.render('products/checkout', checkoutLocals({ product, booking, totals, error: null }));
  },

  quoteRoute: async (req, res) => {
    try {
      const booking = req.session.booking || {};
      const row = booking.productId
        ? await db.Product.findByPk(booking.productId, { include: productInclude })
        : null;
      const product = presentProduct(row);
      if (!product) {
        return res.status(400).json({ success: false, message: 'No hay un vehículo en el carrito.' });
      }
      const center = examCenterForZone(product.zone);
      const km = await drivingDistanceKm(
        { lat: req.body.lat, lng: req.body.lng },
        center
      );
      const timeSlot = req.body.time_slot || booking.time_slot;
      const instructor = req.body.instructor === '0' ? false : Boolean(booking.instructor || req.body.instructor === '1');
      const totals = bookingTotals({
        productPrice: product.price,
        instructor,
        pickup: true,
        pickupKm: km,
        outsideCity: product.zone === 'GBA',
        timeSlot
      });
      req.session.booking = {
        ...booking,
        instructor: true,
        pickup: true,
        pickupLat: Number(req.body.lat),
        pickupLng: Number(req.body.lng),
        pickupAddress: String(req.body.address || '').trim() || booking.pickupAddress,
        pickupKm: km,
        time_slot: timeSlot
      };
      return res.json({
        success: true,
        km: Number(km.toFixed(2)),
        totals,
        center
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'No se pudo calcular la ruta'
      });
    }
  },

  processCheckout: async (req, res) => {
    const date = (req.body.date || '').trim();
    const time_slot = (req.body.time_slot || '').trim();
    const booking = req.session.booking || {};
    const row = booking.productId
      ? await db.Product.findByPk(booking.productId, { include: productInclude })
      : null;

    const product = presentProduct(row);
    const pickup = req.body.pickup === '1';
    const instructor = pickup || req.body.instructor === '1' || Boolean(booking.instructor);
    const originLat = Number(req.body.origin_lat);
    const originLng = Number(req.body.origin_lng);
    const originAddress = String(req.body.origin_address || '').trim();

    let pickupKm = Number(booking.pickupKm) || 0;
    let totals = bookingTotals({
      productPrice: product && product.price,
      instructor,
      pickup: false,
      pickupKm: 0,
      outsideCity: Boolean(product && product.zone === 'GBA'),
      timeSlot: time_slot || booking.time_slot
    });

    const contactPhone = String(req.body.contact_phone || '').trim();
    const phoneDigits = contactPhone.replace(/\D/g, '');

    const viewBooking = {
      ...booking,
      date,
      time_slot,
      instructor,
      pickup,
      pickupAddress: originAddress || booking.pickupAddress,
      pickupKm,
      contactPhone
    };

    const renderForm = (error) => res.status(400).render(
      'products/checkout',
      checkoutLocals({ product, booking: viewBooking, totals, error })
    );

    if (!date || !time_slot) {
      return renderForm('Elegí fecha y franja horaria para confirmar el turno.');
    }

    if (phoneDigits.length < 10) {
      return renderForm('Ingresá un teléfono de WhatsApp para coordinar el servicio.');
    }

    if (pickup) {
      if (!instructor) {
        return renderForm('El retiro a domicilio requiere instructor acompañante.');
      }
      if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
        return renderForm('Buscá o marcá el punto de retiro y tocá “Confirmar este retiro”.');
      }
      try {
        const center = examCenterForZone(product && product.zone);
        pickupKm = await drivingDistanceKm({ lat: originLat, lng: originLng }, center);
        totals = bookingTotals({
          productPrice: product && product.price,
          instructor: true,
          pickup: true,
          pickupKm,
          outsideCity: Boolean(product && product.zone === 'GBA'),
          timeSlot: time_slot
        });
        viewBooking.pickupKm = pickupKm;
        viewBooking.pickupLat = originLat;
        viewBooking.pickupLng = originLng;
      } catch (error) {
        return renderForm(error.message || 'No se pudo calcular el viaje hasta la sede.');
      }
    }

    const paid = parsePayment(req.body);
    if (paid.error) {
      return renderForm(paid.error);
    }

    try {
      if (!req.session.user) {
        return res.redirect('/users/login');
      }
      const reservationStatus = paid.payment.method === 'mercadopago' ? 'pending' : 'confirmed';
      await withApiToken(req.session, (token) => createReservation(token, { date, time_slot, status: reservationStatus }));
      req.session.booking = null;
      return res.render('products/checkoutOk', {
        title: reservationStatus === 'pending' ? 'Reserva registrada — RendiYa' : 'Reserva confirmada — RendiYa',
        date,
        time_slot,
        product,
        booking: viewBooking,
        totals,
        payment: paid.payment,
        reservationStatus,
        examCenter: examCenterForZone(product && product.zone)
      });
    } catch (error) {
      return renderForm(error.message || 'No se pudo confirmar la reserva. Intentá de nuevo en unos minutos.');
    }
  },

  create: async (req, res) => {
    const options = await catalogs();
    res.render('products/productCreate', {
      title: 'Cargar vehículo — RendiYa',
      errors: {},
      old: {},
      productCategories: options.productCategories,
      brands: options.brands,
      colors: options.colors,
      zones: options.zones
    });
  },

  store: async (req, res) => {
    const errors = firstErrors(req);
    if (Object.keys(errors).length) {
      const options = await catalogs();
      return res.render('products/productCreate', {
        title: 'Cargar vehículo — RendiYa',
        errors,
        old: req.body,
        productCategories: options.productCategories,
        brands: options.brands,
        colors: options.colors,
        zones: options.zones
      });
    }
    const product = await db.Product.create(await payloadFromBody(req));
    res.redirect('/products/' + product.id);
  },

  edit: async (req, res) => {
    const row = await db.Product.findByPk(req.params.id, { include: productInclude });
    if (!row) {
      return res.redirect('/products');
    }
    const options = await catalogs();
    res.render('products/productEdit', {
      title: `Editar ${row.name} — RendiYa`,
      product: presentProduct(row),
      errors: {},
      old: {},
      productCategories: options.productCategories,
      brands: options.brands,
      colors: options.colors,
      zones: options.zones
    });
  },

  update: async (req, res) => {
    const row = await db.Product.findByPk(req.params.id, { include: productInclude });
    if (!row) {
      return res.redirect('/products');
    }
    const errors = firstErrors(req);
    if (Object.keys(errors).length) {
      const options = await catalogs();
      return res.render('products/productEdit', {
        title: `Editar ${row.name} — RendiYa`,
        product: presentProduct(row),
        errors,
        old: req.body,
        productCategories: options.productCategories,
        brands: options.brands,
        colors: options.colors,
        zones: options.zones
      });
    }
    await row.update(await payloadFromBody(req, row));
    res.redirect('/products/' + req.params.id);
  },

  destroy: async (req, res) => {
    const row = await db.Product.findByPk(req.params.id);
    if (row) {
      await db.CartItem.destroy({ where: { productId: row.id } });
      await row.destroy();
    }
    res.redirect('/products/baja');
  },

  bajaList: async (req, res) => {
    const rows = await db.Product.findAll({ include: productInclude, order: [['id', 'ASC']] });
    res.render('products/productBaja', {
      title: 'Gestionar flota — RendiYa',
      products: rows.map(presentProduct).filter((item) => !/test/i.test(item.name))
    });
  }
};

module.exports = productsController;
