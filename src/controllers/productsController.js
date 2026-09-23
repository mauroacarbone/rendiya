const { Op } = require('sequelize');
const db = require('../database/models');
const { presentProduct, productInclude } = require('../database/presenters');
const { firstErrors } = require('../middlewares/validations');
const {
  createReservation,
  withApiToken,
  updateReservation,
  notifyPaymentApproved,
  venueAvailability,
  syncStorefrontUser
} = require('../services/rendiyaApi');
const { bookingTotals, INSTRUCTOR_FEE } = require('../services/taxiTariff');
const { ensureVenues, venues, findVenue, venueForProduct, slotsForVenue } = require('../services/venues');
const { drivingDistanceKm } = require('../services/mapsRoute');
const { PAYMENT_METHODS, parsePayment } = require('../services/payment');
const { addonsCatalog } = require('../services/addons');
const { normalizePhone } = require('../utils/phone');

function checkoutLocals({ product, booking, totals, error }) {
  const venue = venueForProduct(product);
  return {
    title: 'Confirmar reserva — RendiYa',
    product,
    booking,
    totals,
    error: error || null,
    examCenter: venue,
    venue,
    timeSlots: slotsForVenue(venue),
    addons: addonsCatalog(booking && booking.addons),
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
  await ensureVenues();
  return {
    productCategories: categories.map((row) => row.get({ plain: true })),
    brands: brands.map((row) => row.get({ plain: true })),
    colors: colors.map((row) => row.get({ plain: true })),
    zones: zones.map((row) => row.get({ plain: true })),
    venueList: venues()
  };
}

async function payloadFromBody(req, current) {
  const productCategoryId = Number(req.body.productCategoryId) || (current && current.productCategoryId) || 1;
  const category = await db.ProductCategory.findByPk(productCategoryId);
  const isMoto = category && category.name === 'Moto';
  const venue = findVenue(req.body.venueSlug) || findVenue(current && current.venueSlug);

  return {
    venueSlug: venue ? venue.slug : null,
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
    await ensureVenues();
    const { category, zone, q, sede } = req.query;
    const where = {};
    const include = productInclude.map((item) => ({ ...item }));

    if (q) {
      where.name = { [Op.like]: '%' + q + '%' };
    }
    if (sede) {
      where.venueSlug = sede;
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
    if (sede) {
      req.session.preferredVenue = sede;
    }
    const products = rows.map(presentProduct).filter((item) => !/test/i.test(item.name));
    res.render('products/productList', {
      title: 'Catálogo — RendiYa',
      products,
      category: category || '',
      zone: zone || '',
      q: q || '',
      sede: sede || '',
      venueList: venues(),
      venueFor: venueForProduct
    });
  },

  availability: async (req, res) => {
    const sede = String(req.query.sede || '').trim();
    const date = String(req.query.date || '').slice(0, 10);
    if (!sede || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'Indicá sede y fecha.' });
    }
    try {
      return res.json({ success: true, data: await venueAvailability(sede, date) });
    } catch (error) {
      return res.status(error.status === 404 ? 404 : 503).json({
        success: false,
        message: error.message || 'No se pudo consultar la disponibilidad.'
      });
    }
  },

  detail: async (req, res) => {
    await ensureVenues();
    const row = await db.Product.findByPk(req.params.id, { include: productInclude });
    if (!row) {
      return res.redirect('/products');
    }
    const product = presentProduct(row);
    res.render('products/productDetail', {
      title: `${row.name} — RendiYa`,
      product,
      venue: venueForProduct(product)
    });
  },

  cart: async (req, res) => {
    if (req.query.clear) {
      req.session.booking = null;
      return res.redirect('/products/cart');
    }

    await ensureVenues();
    const productId = req.query.id || (req.session.booking && req.session.booking.productId);
    if (!productId) {
      return res.render('products/productCart', {
        title: 'Carrito — RendiYa',
        product: null,
        instructor: false,
        pickup: false,
        booking: null,
        venue: null,
        addons: addonsCatalog([]),
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
    const venue = venueForProduct(product);
    const slots = slotsForVenue(venue);
    const requested = req.query.franja || previous.time_slot || '';
    const time_slot = slots.includes(requested) ? requested : slots[0];
    const addons = submitted || Object.prototype.hasOwnProperty.call(req.query, 'addons')
      ? req.query.addons
      : previous.addons;
    const outsideCity = product.zone === 'GBA';
    const totals = bookingTotals({
      productPrice: product.price,
      instructor,
      pickup,
      pickupKm,
      outsideCity,
      timeSlot: time_slot,
      addons
    });

    req.session.booking = {
      productId: product.id,
      date,
      time_slot,
      instructor,
      pickup,
      pickupKm,
      pickupAddress,
      outsideCity,
      venueSlug: venue.slug,
      addons: totals.addons.map((addon) => addon.code)
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
      venue,
      timeSlots: slots,
      addons: addonsCatalog(req.session.booking.addons),
      totals,
      instructorFee: INSTRUCTOR_FEE
    });
  },

  checkout: async (req, res) => {
    await ensureVenues();
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
      timeSlot: booking.time_slot,
      addons: booking.addons
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
      const center = venueForProduct(product);
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
        timeSlot,
        addons: booking.addons
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
    await ensureVenues();
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

    const venue = venueForProduct(product);
    const addons = Object.prototype.hasOwnProperty.call(req.body, 'addons') ? req.body.addons : booking.addons;

    let pickupKm = Number(booking.pickupKm) || 0;
    let totals = bookingTotals({
      productPrice: product && product.price,
      instructor,
      pickup: false,
      pickupKm: 0,
      outsideCity: Boolean(product && product.zone === 'GBA'),
      timeSlot: time_slot || booking.time_slot,
      addons
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
      contactPhone,
      venueSlug: venue && venue.slug,
      addons: totals.addons.map((addon) => addon.code)
    };

    const renderForm = (error) => res.status(400).render(
      'products/checkout',
      checkoutLocals({ product, booking: viewBooking, totals, error })
    );

    if (!date || !time_slot) {
      return renderForm('Elegí fecha y franja horaria para confirmar el turno.');
    }

    if (venue && !slotsForVenue(venue).includes(time_slot)) {
      return renderForm(`${venue.name} atiende en estas franjas: ${slotsForVenue(venue).join(', ')}.`);
    }

    if (phoneDigits.length < 10) {
      return renderForm('Ingresá un teléfono de WhatsApp para coordinar el servicio.');
    }

    if (req.session.user) {
      const phone = normalizePhone(contactPhone);
      if (phone) {
        await db.User.update({ phone }, { where: { id: req.session.user.id } });
        req.session.user.phone = phone;
        await syncStorefrontUser(req.session);
      }
    }

    if (pickup) {
      if (!instructor) {
        return renderForm('El retiro a domicilio requiere instructor acompañante.');
      }
      if (!Number.isFinite(originLat) || !Number.isFinite(originLng)) {
        return renderForm('Buscá o marcá el punto de retiro y tocá “Confirmar este retiro”.');
      }
      try {
        pickupKm = await drivingDistanceKm({ lat: originLat, lng: originLng }, venue);
        totals = bookingTotals({
          productPrice: product && product.price,
          instructor: true,
          pickup: true,
          pickupKm,
          outsideCity: Boolean(product && product.zone === 'GBA'),
          timeSlot: time_slot,
          addons
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
      const created = await withApiToken(req.session, (token) => createReservation(token, {
        date,
        time_slot,
        status: 'pending',
        venue_slug: venue && venue.slug,
        addons: totals.addons,
        amount: totals.total
      }));
      const reservation = created && created.data ? created.data : created;
      if (!reservation || !reservation.id) {
        return renderForm('No se pudo abrir la pasarela. Intentá de nuevo.');
      }
      req.session.booking = null;
      req.session.pendingPayment = {
        reservationId: reservation && reservation.id,
        date,
        time_slot,
        product,
        booking: viewBooking,
        totals,
        payment: paid.payment,
        examCenter: venue,
        venue
      };
      const finish = () => res.redirect('/products/pago');
      if (typeof req.session.save === 'function') {
        return req.session.save(() => finish());
      }
      return finish();
    } catch (error) {
      return renderForm(error.message || 'No se pudo confirmar la reserva. Intentá de nuevo en unos minutos.');
    }
  },

  paymentGateway: (req, res) => {
    const pending = req.session.pendingPayment;
    if (!pending || !pending.reservationId) {
      return res.redirect('/products/checkout');
    }
    return res.render('products/paymentGateway', {
      title: 'Pagar turno — RendiYa',
      error: null,
      ...pending
    });
  },

  processPayment: async (req, res) => {
    const pending = req.session.pendingPayment;
    if (!pending || !pending.reservationId) {
      return res.redirect('/products/checkout');
    }

    const paid = parsePayment(req.body, { requireDetails: true });
    if (paid.error) {
      return res.status(400).render('products/paymentGateway', {
        title: 'Pagar turno — RendiYa',
        error: paid.error,
        ...pending,
        payment: { ...pending.payment, method: req.body.payment_method || pending.payment.method }
      });
    }

    try {
      let assignment = null;
      try {
        const acknowledged = await notifyPaymentApproved(pending.reservationId);
        assignment = acknowledged && acknowledged.data ? acknowledged.data : null;
      } catch {
        await withApiToken(req.session, (token) => updateReservation(token, pending.reservationId, { status: 'confirmed' }));
      }
      const receipt = {
        ...pending,
        payment: paid.payment,
        reservationStatus: 'confirmed',
        assignment
      };
      req.session.pendingPayment = null;
      const renderOk = () => res.render('products/checkoutOk', {
        title: 'Pago aprobado — RendiYa',
        ...receipt
      });
      if (typeof req.session.save === 'function') {
        return req.session.save(() => renderOk());
      }
      return renderOk();
    } catch (error) {
      return res.status(400).render('products/paymentGateway', {
        title: 'Pagar turno — RendiYa',
        error: error.message || 'No se pudo acreditar el pago. Intentá de nuevo.',
        ...pending
      });
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
      zones: options.zones,
      venueList: options.venueList
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
        zones: options.zones,
        venueList: options.venueList
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
      zones: options.zones,
      venueList: options.venueList
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
        zones: options.zones,
        venueList: options.venueList
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
