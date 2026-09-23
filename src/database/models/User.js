module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    firstName: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    image: {
      type: DataTypes.STRING(255),
      defaultValue: '/images/favicon.png'
    },
    userCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'users',
    underscored: true
  });

  User.associate = (models) => {
    User.belongsTo(models.UserCategory, {
      as: 'category',
      foreignKey: 'userCategoryId'
    });
    User.hasMany(models.Cart, {
      as: 'carts',
      foreignKey: 'userId'
    });
  };

  return User;
};
