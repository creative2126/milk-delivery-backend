// backend/routes/enhancedSubscriptionRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../models"); // loads index.js
const { EnhancedSubscription } = db; // get model

const { validateSubscription } = require("../middleware/validation");
const logger = require("../utils/logger");

router.post("/", validateSubscription, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, error: "User not authenticated" });
    }

    const subscriptionData = { ...req.body, userId: req.user.id };

    const hasActive = await EnhancedSubscription.findOne({
      where: {
        userId: subscriptionData.userId,
        productId: subscriptionData.productId,
        status: "active",
      },
    });

    if (hasActive) {
      return res.status(409).json({
        success: false,
        error: "You already have an active subscription for this product",
      });
    }

    const subscription = await EnhancedSubscription.create(subscriptionData);

    return res.status(201).json({
      success: true,
      data: subscription,
      message: "Subscription created successfully",
    });
  } catch (error) {
    logger.error("Error creating subscription:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create subscription",
      details: error.message,
    });
  }
});

module.exports = router;
