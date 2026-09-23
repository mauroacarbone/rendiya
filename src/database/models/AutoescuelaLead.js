const STATUSES = ['new', 'contacted', 'approved', 'rejected'];

module.exports = (sequelize, DataTypes) => {
  const AutoescuelaLead = sequelize.define('AutoescuelaLead', {
    schoolName: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    contactName: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    zone: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    neighborhood: {
      type: DataTypes.STRING(80),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    monthlyStudents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    fleetSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'new',
      validate: { isIn: [STATUSES] }
    },
    statusChangedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    statusChangedById: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    autoescuelaId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'autoescuela_leads',
    underscored: true
  });

  AutoescuelaLead.STATUSES = STATUSES;

  AutoescuelaLead.associate = (models) => {
    AutoescuelaLead.belongsTo(models.Autoescuela, {
      as: 'autoescuela',
      foreignKey: 'autoescuelaId'
    });
    AutoescuelaLead.belongsTo(models.User, {
      as: 'statusChangedBy',
      foreignKey: 'statusChangedById',
      constraints: false
    });
  };

  return AutoescuelaLead;
};
