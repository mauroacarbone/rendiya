const db = require('./models');

async function seedIfEmpty() {
  const count = await db.User.count();
  if (count > 0) {
    return;
  }

  await db.UserCategory.bulkCreate([
    { id: 1, name: 'admin' },
    { id: 2, name: 'client' },
    { id: 3, name: 'instructor' }
  ]);

  await db.ProductCategory.bulkCreate([
    { id: 1, name: 'Auto' },
    { id: 2, name: 'Moto' }
  ]);

  await db.Brand.bulkCreate([
    { id: 1, name: 'Toyota' },
    { id: 2, name: 'Volkswagen' },
    { id: 3, name: 'Ford' },
    { id: 4, name: 'Fiat' },
    { id: 5, name: 'Honda' },
    { id: 6, name: 'Yamaha' },
    { id: 7, name: 'Chevrolet' }
  ]);

  await db.Color.bulkCreate([
    { id: 1, name: 'Blanco' },
    { id: 2, name: 'Gris' },
    { id: 3, name: 'Rojo' },
    { id: 4, name: 'Plata' },
    { id: 5, name: 'Negro' },
    { id: 6, name: 'Azul' }
  ]);

  await db.Zone.bulkCreate([
    { id: 1, name: 'CABA' },
    { id: 2, name: 'GBA' }
  ]);

  await db.User.bulkCreate([
    { id: 1, firstName: 'Mauro', lastName: 'Carbone', email: 'mauro@rendiya.ar', password: '$2b$10$kUVI/8fjPJPmk1ZY8rSagOZHlxOUXXKdjxLWFKVGcEAxRWU4WMPly', image: '/images/favicon.png', userCategoryId: 1 },
    { id: 2, firstName: 'Lucía', lastName: 'Benítez', email: 'lucia.benitez@mail.com', password: '$2b$10$YSxQQY74GmGMzTv7QwF2AecbsNc.fVW/OFIQi1dzY1jmNZYUkg9Ei', image: '/images/favicon.png', userCategoryId: 2 },
    { id: 3, firstName: 'Diego', lastName: 'Fernández', email: 'diego.fernandez@mail.com', password: '$2b$10$8YYqGiNy2s8gxOMzmgxrn.UJZd8ibHpm3xvF19DaiimMWSu5SAr76', image: '/images/favicon.png', userCategoryId: 2 },
    { id: 4, firstName: 'Camila', lastName: 'Sosa', email: 'camila.sosa@mail.com', password: '$2b$10$DoJJ0.8iq/Ul9dea8gJZduQbUARFV2vKzGtvwfNR6oBkn0rYMKywu', image: '/images/favicon.png', userCategoryId: 3 },
    { id: 5, firstName: 'Nicolás', lastName: 'Paz', email: 'nicolas.paz@mail.com', password: '$2b$10$bV2WbUZCJwH5jPuxpOtmKuPlJgmdXIDlGllKQdrTPAkfmYD7EMZ/y', image: '/images/favicon.png', userCategoryId: 2 },
    { id: 6, firstName: 'Sofía', lastName: 'Ramos', email: 'sofia.ramos@mail.com', password: '$2b$10$U6q3yD7SYVqM5SrG6sBpJebHplaqdcyHQQzhxS3trimfnmQszJG8q', image: '/images/favicon.png', userCategoryId: 2 }
  ]);

  await db.Product.bulkCreate([
    { id: 1, name: 'Toyota Etios', description: 'Uno de los autos más usados en el práctico de CABA: compacto, visibilidad alta y caja simple. VTV y seguro de examen incluidos.', image: '/images/etios.jpg', price: 42000, productCategoryId: 1, brandId: 1, colorId: 1, zoneId: 1, transmission: 'Manual', license: 'Clase B', vtv: true, insurance: true },
    { id: 2, name: 'Volkswagen Gol Trend', description: 'Clásico de las autoescuelas porteñas. Dirección liviana y tamaño cómodo para maniobras en el circuito de CABA.', image: '/images/gol-tred.jpg', price: 40000, productCategoryId: 1, brandId: 2, colorId: 2, zoneId: 1, transmission: 'Manual', license: 'Clase B', vtv: true, insurance: true },
    { id: 3, name: 'Ford Ka', description: 'Chico, fácil de estacionar y habitual en turnos de GBA. Ideal si practicaste con un auto corto.', image: '/images/ford-ka.jpg', price: 38000, productCategoryId: 1, brandId: 3, colorId: 3, zoneId: 2, transmission: 'Manual', license: 'Clase B', vtv: true, insurance: true },
    { id: 4, name: 'Fiat Cronos', description: 'Sedán automático, aire y papeles al día. Opción cómoda para rendir en CABA si preferís no pelearte con el embrague.', image: '/images/cronos.jpg', price: 45000, productCategoryId: 1, brandId: 4, colorId: 4, zoneId: 1, transmission: 'Automática', license: 'Clase B', vtv: true, insurance: true },
    { id: 5, name: 'Honda Wave', description: 'La moto más pedida para el examen clase A: liviana, baja y estable. Casco disponible como extra.', image: '/images/ona-wave.jpg', price: 28000, productCategoryId: 2, brandId: 5, colorId: 5, zoneId: 1, transmission: 'Manual', license: 'Clase A', vtv: true, insurance: true },
    { id: 6, name: 'Honda Titan', description: 'Cub 150 habitual en CABA y GBA. Un poco más de peso que la Wave; sirve si ya viniste practicando en Titan.', image: '/images/titan.jpg', price: 30000, productCategoryId: 2, brandId: 5, colorId: 3, zoneId: 2, transmission: 'Manual', license: 'Clase A', vtv: true, insurance: true },
    { id: 7, name: 'Yamaha Fazer', description: 'Moto de mayor porte para quienes rinden con una unidad similar a la que usan en la calle. Seguro de examen incluido.', image: '/images/fazer600.jpg', price: 35000, productCategoryId: 2, brandId: 6, colorId: 6, zoneId: 1, transmission: 'Manual', license: 'Clase A', vtv: true, insurance: true },
    { id: 8, name: 'Chevrolet Prisma', description: 'Sedán de escuela, muy usado en GBA para clase B. Documentación y VTV al día.', image: '/images/etios.jpg', price: 41000, productCategoryId: 1, brandId: 7, colorId: 1, zoneId: 2, transmission: 'Manual', license: 'Clase B', vtv: true, insurance: true }
  ]);

  await db.Cart.create({ id: 1, userId: 2, total: 70000, status: 'open' });
  await db.CartItem.bulkCreate([
    { id: 1, cartId: 1, productId: 1, quantity: 1, unitPrice: 42000, subtotal: 42000 },
    { id: 2, cartId: 1, productId: 5, quantity: 1, unitPrice: 28000, subtotal: 28000 }
  ]);
}

const DEMO_PASSWORD_HASH = '$2b$10$PTHXSpWCoz/0YyZo6PM7jOh0zXZi4g2g18aHNMEOlHHLA.CQgJgFe';

async function ensureDemoAccounts() {
  const demos = [
    {
      email: 'demo@rendiya.ar',
      firstName: 'Demo',
      lastName: 'Cliente',
      userCategoryId: 2
    },
    {
      email: 'admin@rendiya.ar',
      firstName: 'Demo',
      lastName: 'Admin',
      userCategoryId: 1
    }
  ];

  for (const demo of demos) {
    const existing = await db.User.findOne({ where: { email: demo.email } });
    if (existing) {
      await existing.update({
        password: DEMO_PASSWORD_HASH,
        userCategoryId: demo.userCategoryId
      });
    } else {
      await db.User.create({
        ...demo,
        password: DEMO_PASSWORD_HASH,
        image: '/images/favicon.png'
      });
    }
  }
}

module.exports = { seedIfEmpty, ensureDemoAccounts };
