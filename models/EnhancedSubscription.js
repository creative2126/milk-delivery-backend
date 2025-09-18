"use strict";

module.exports = (sequelize, DataTypes) => {
  const EnhancedSubscription = sequelize.define(
    "EnhancedSubscription",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Users", key: "id" },
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Products", key: "id" },
      },
      addressId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Addresses", key: "id" },
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1.0,
        validate: { min: 0.1 },
      },
      frequency: {
        type: DataTypes.ENUM("daily", "weekly", "biweekly", "monthly"),
        allowNull: false,
        defaultValue: "weekly",
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      nextDeliveryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("active", "paused", "cancelled", "trial", "expired"),
        allowNull: false,
        defaultValue: "trial",
      },
      trialPeriodDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7,
        validate: { min: 0, max: 30 },
      },
      trialEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      pricePerUnit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      totalBillableAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      discountPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },
      taxPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },
      deliveryInstructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      specialNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      pauseStartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      pauseEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      pauseReason: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      cancellationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      cancellationReason: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      autoRenew: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      paymentMethodId: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      billingCycle: {
        type: DataTypes.ENUM("weekly", "monthly", "quarterly", "annually"),
        allowNull: false,
        defaultValue: "monthly",
      },
      lastPaymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      nextPaymentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      failedPaymentAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0 },
      },
      maxFailedPayments: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
        validate: { min: 1, max: 10 },
      },
      isGift: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      giftRecipientEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: { isEmail: true },
      },
      giftMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      referralCode: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      source: {
        type: DataTypes.ENUM("web", "mobile", "admin", "api", "import"),
        allowNull: false,
        defaultValue: "web",
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "EnhancedSubscriptions",
      indexes: [
        { name: "idx_enhanced_subscriptions_user_status", fields: ["userId", "status"] },
        { name: "idx_enhanced_subscriptions_product_status", fields: ["productId", "status"] },
        { name: "idx_enhanced_subscriptions_next_delivery", fields: ["nextDeliveryDate", "status"] },
        { name: "idx_enhanced_subscriptions_status_dates", fields: ["status", "startDate", "endDate"] },
        { name: "idx_enhanced_subscriptions_trial_end", fields: ["trialEndDate", "status"] },
        { name: "idx_enhanced_subscriptions_payment_dates", fields: ["nextPaymentDate", "lastPaymentDate"] },
      ],
      hooks: {
        beforeCreate: (subscription) => {
          const baseAmount = subscription.quantity * subscription.pricePerUnit;
          const discountAmount = baseAmount * (subscription.discountPercentage / 100);
          const taxAmount = (baseAmount - discountAmount) * (subscription.taxPercentage / 100);
          subscription.totalBillableAmount = baseAmount - discountAmount + taxAmount;
        },
        beforeUpdate: (subscription) => {
          if (
            subscription.changed("quantity") ||
            subscription.changed("pricePerUnit") ||
            subscription.changed("discountPercentage") ||
            subscription.changed("taxPercentage")
          ) {
            const baseAmount = subscription.quantity * subscription.pricePerUnit;
            const discountAmount = baseAmount * (subscription.discountPercentage / 100);
            const taxAmount = (baseAmount - discountAmount) * (subscription.taxPercentage / 100);
            subscription.totalBillableAmount = baseAmount - discountAmount + taxAmount;
          }
          subscription.updatedAt = new Date();
        },
      },
    }
  );

  EnhancedSubscription.associate = (models) => {
    EnhancedSubscription.belongsTo(models.User, { foreignKey: "userId", as: "user" });
    EnhancedSubscription.belongsTo(models.Product, { foreignKey: "productId", as: "product" });
    EnhancedSubscription.belongsTo(models.Address, { foreignKey: "addressId", as: "address" });
    EnhancedSubscription.hasMany(models.SubscriptionDelivery, { foreignKey: "subscriptionId", as: "deliveries" });
    EnhancedSubscription.hasMany(models.SubscriptionPayment, { foreignKey: "subscriptionId", as: "payments" });
    EnhancedSubscription.hasMany(models.SubscriptionModification, { foreignKey: "subscriptionId", as: "modifications" });
  };

  return EnhancedSubscription;
};
