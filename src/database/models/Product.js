module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    image: {
      type: DataTypes.STRING(255),
      defaultValue: '/images/etios.jpg'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    productCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    brandId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    colorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    zoneId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    venueSlug: {
      type: DataTypes.STRING(60),
      allowNull: true
    },
    transmission: {
      type: DataTypes.STRING(40),
      defaultValue: 'Manual'
    },
    license: {
      type: DataTypes.STRING(40),
      defaultValue: 'Clase B'
    },
    vtv: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    insurance: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'products',
    underscored: true
  });

  Product.associate = (models) => {
    Product.belongsTo(models.ProductCategory, {
      as: 'category',
      foreignKey: 'productCategoryId'
    });
    Product.belongsTo(models.Brand, {
      as: 'brand',
      foreignKey: 'brandId'
    });
    Product.belongsTo(models.Color, {
      as: 'color',
      foreignKey: 'colorId'
    });
    Product.belongsTo(models.Zone, {
      as: 'zone',
      foreignKey: 'zoneId'
    });
    Product.hasMany(models.CartItem, {
      as: 'cartItems',
      foreignKey: 'productId'
    });
  };

  return Product;
};
