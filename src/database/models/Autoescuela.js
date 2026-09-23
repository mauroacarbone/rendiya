const STATUSES = ['featured', 'standard'];

module.exports = (sequelize, DataTypes) => {
  const Autoescuela = sequelize.define('Autoescuela', {
    name: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    logo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    zone: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    neighborhood: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0, max: 5 }
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'standard',
      validate: { isIn: [STATUSES] }
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'autoescuelas',
    underscored: true
  });

  Autoescuela.STATUSES = STATUSES;

  Autoescuela.associate = (models) => {
    Autoescuela.hasOne(models.AutoescuelaLead, {
      as: 'lead',
      foreignKey: 'autoescuelaId'
    });
  };

  return Autoescuela;
};
