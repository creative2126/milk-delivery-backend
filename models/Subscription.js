'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      Subscription.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      Subscription.belongsTo(models.DeliveryZone, {
        foreignKey: 'delivery_zone_id',
        as: 'deliveryZone'
      });
    }
  }

  Subscription.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    milk_type: {
      type: DataTypes.ENUM('500ml', '1000ml'),
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    frequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      allowNull: false
    },
    delivery_address: {
      type: DataTypes.JSON,
      allowNull: false
    },
    delivery_zone_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'delivery_zones',
        key: 'id'
      }
    },
    preferred_delivery_time: {
      type: DataTypes.STRING,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'paused', 'cancelled', 'expired'),
      defaultValue: 'active'
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    next_delivery_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    loyalty_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    referral_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    preferred_language: {
      type: DataTypes.STRING(10),
      defaultValue: 'en'
    },
    notification_preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        email: true,
        sms: true,
        push: true
      }
    },
    delivery_time_slot: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    auto_renew: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    pause_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    subscription_status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active'
    },
    payment_method: {
      type: DataTypes.STRING(50),
      defaultValue: 'razorpay'
    },
    delivery_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    razorpay_order_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    razorpay_payment_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    razorpay_signature: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    underscored: true,
    timestamps: false
  });

  return Subscription;
};
