  'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeliveryZone extends Model {
    static associate(models) {
      DeliveryZone.hasMany(models.Subscription, {
        foreignKey: 'delivery_zone_id',
        as: 'subscriptions'
      });
    }
  }

  DeliveryZone.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    zoneName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    postalCodes: {
      type: DataTypes.JSON,
      allowNull: false
    },
    deliveryDays: {
      type: DataTypes.JSON,
      allowNull: false
    },
    deliveryTimeSlots: {
      type: DataTypes.JSON,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    coordinates: {
      type: DataTypes.JSON,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'DeliveryZone',
    tableName: 'delivery_zones',
    underscored: true,
    timestamps: true
  });

  return DeliveryZone;
};
