const db = require('../database/models');
const { presentProduct, productInclude } = require('../database/presenters');

const mainController = {
  home: async (req, res) => {
    const products = (await db.Product.findAll({
      include: productInclude,
      order: [['id', 'ASC']]
    })).map(presentProduct).filter((item) => !/test/i.test(item.name));

    res.render('products/home', {
      title: 'RendiYa — Autos y motos para tu prueba de manejo',
      destacados: products.slice(0, 3),
      caba: products.filter((item) => item.zone === 'CABA'),
      gba: products.filter((item) => item.zone === 'GBA')
    });
  }
};

module.exports = mainController;
