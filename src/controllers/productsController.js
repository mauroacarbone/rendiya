const { Op } = require('sequelize');
const db = require('../database/models');
const { presentProduct, productInclude } = require('../database/presenters');
const { firstErrors } = require('../middlewares/validations');
const { createReservation } = require('../services/rendiyaApi');

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
        booking: null
      });
    }

    const row = await db.Product.findByPk(productId, { include: productInclude });
    const product = presentProduct(row);
    if (!product) {
      req.session.booking = null;
      return res.redirect('/products/cart');
    }

    let instructor = req.session.booking ? Boolean(req.session.booking.instructor) : true;
    if (req.query.instructor !== undefined) {
      instructor = req.query.instructor === '1' || req.query.instructor === 'on';
    }

    req.session.booking = {
      productId: product.id,
      date: req.query.fecha || (req.session.booking && req.session.booking.date) || req.session.preferredDate || '',
      time_slot: req.query.franja || (req.session.booking && req.session.booking.time_slot) || '08:00 – 11:00',
      instructor
    };
    res.locals.cartCount = 1;
    res.render('products/productCart', {
      title: 'Carrito — RendiYa',
      product,
      instructor,
      booking: req.session.booking
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
    res.render('products/checkout', {
      title: 'Confirmar reserva — RendiYa',
      product: presentProduct(row),
      booking,
      error: null
    });
  },

  processCheckout: async (req, res) => {
    const date = (req.body.date || '').trim();
    const time_slot = (req.body.time_slot || '').trim();
    const booking = req.session.booking || {};
    const row = booking.productId
      ? await db.Product.findByPk(booking.productId, { include: productInclude })
      : null;

    const renderForm = (error) => res.status(400).render('products/checkout', {
      title: 'Confirmar reserva — RendiYa',
      product: presentProduct(row),
      booking: { ...booking, date, time_slot },
      error
    });

    if (!date || !time_slot) {
      return renderForm('Elegí fecha y franja horaria para confirmar el turno.');
    }

    try {
      if (!req.session.apiToken) {
        return renderForm('Volvé a iniciar sesión para confirmar la reserva en el sistema.');
      }
      await createReservation(req.session.apiToken, { date, time_slot, status: 'confirmed' });
      req.session.booking = null;
      return res.render('products/checkoutOk', {
        title: 'Reserva confirmada — RendiYa',
        date,
        time_slot,
        product: presentProduct(row)
      });
    } catch (error) {
      return renderForm(error.message || 'No se pudo confirmar la reserva. ¿Está levantada rendiya-api?');
    }
  },

  create: async (req, res) => {
    const options = await catalogs();
    res.render('products/productCreate', {
      title: 'Alta de vehículo — RendiYa',
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
        title: 'Alta de vehículo — RendiYa',
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
      title: 'Baja de vehículo — RendiYa',
      products: rows.map(presentProduct).filter((item) => !/test/i.test(item.name))
    });
  }
};

module.exports = productsController;
