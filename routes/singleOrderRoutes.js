const express = require("express");
const router = express.Router();
const db = require("../db");

/**
 * SAVE SINGLE ORDER (Tomorrow Morning Delivery)
 */
router.post("/single-order/save", async (req, res) => {
  try {
    const {
      user_email,
      total_amount,
      payment_id,
      address,
      latitude,
      longitude
    } = req.body;

    // ✅ Basic validation
    if (!user_email || !total_amount || !payment_id || !address) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // ✅ Tomorrow date (Sid’s Farm model)
    const deliveryDateQuery = `CURDATE() + INTERVAL 1 DAY`;

    // ✅ INSERT ORDER
    await db.execute(
      `
      INSERT INTO orders (
        user_email,
        total_amount,
        payment_id,
        order_type,
        order_status,
        delivery_date,
        delivery_slot,
        address,
        latitude,
        longitude,
        created_at
      )
      VALUES (
        ?, ?, ?, 'single', 'paid',
        ${deliveryDateQuery},
        'morning',
        ?, ?, ?, NOW()
      )
      `,
      [
        user_email,
        total_amount,
        payment_id,
        address,
        latitude || null,
        longitude || null
      ]
    );

    return res.json({
      success: true,
      message: "Single order placed successfully",
      delivery: "Tomorrow Morning"
    });

  } catch (error) {
    console.error("❌ Single order save failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save single order"
    });
  }
});

module.exports = router;
