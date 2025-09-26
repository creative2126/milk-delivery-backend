// backend/routes/enhancedSubscriptionRoutes.js
const express = require("express");
const router = express.Router();
const { query } = require("../db"); // ✅ execute not used, so removed

// ✅ Create / Update Subscription
router.post("/", async (req, res) => {
  try {
    const {
      username,
      subscription_type,
      duration,
      amount,
      address,
      building_name,
      flat_number,
      payment_id,
      replace_existing
    } = req.body;

    if (!username || !subscription_type || !duration) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ Check if user exists
    const [users] = await query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, username]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = users[0].id;

    // ✅ Check if user already has an active subscription (unless replacing)
    if (!replace_existing) {
      const [activeSubs] = await query(
        'SELECT id FROM users WHERE id = ? AND subscription_status = "active"',
        [userId]
      );

      if (activeSubs && activeSubs.length > 0) {
        return res.status(400).json({
          error: "Active subscription exists",
          message:
            "User already has an active subscription. Cannot create new subscription until current one expires.",
          code: 1007
        });
      }
    }

    // ✅ Calculate correct end date based on duration
    let daysToAdd;
    if (duration === "6days") {
      daysToAdd = 7; // 6 days + 1 free
    } else if (duration === "15days") {
      daysToAdd = 17; // 15 days + 2 free
    } else {
      daysToAdd = 15; // fallback
    }

    // ✅ Update user row with subscription details
    await query(
      `UPDATE users SET
        subscription_type = ?,
        subscription_duration = ?,
        subscription_status = 'active',
        subscription_amount = ?,
        subscription_address = ?,
        subscription_building_name = ?,
        subscription_flat_number = ?,
        subscription_payment_id = ?,
        subscription_start_date = NOW(),
        subscription_end_date = DATE_ADD(NOW(), INTERVAL ${daysToAdd} DAY),
        subscription_created_at = NOW(),
        subscription_updated_at = NOW()
      WHERE username = ? OR email = ?`,
      [
        subscription_type,
        duration,
        amount,
        address,
        building_name,
        flat_number,
        payment_id,
        username,
        username
      ]
    );

    res
      .status(201)
      .json({ success: true, message: "Subscription created/updated successfully" });
  } catch (error) {
    console.error("Subscription create error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get Subscription by Username
router.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const [rows] = await query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, username]
    );
    if (rows.length === 0) {
      return res
        .status(404)
        .json({ subscription: null, hasActiveSubscription: false });
    }

    const user = rows[0];
    let subscription = null;

    if (user.subscription_type) {
      subscription = {
        type: user.subscription_type,
        duration: user.subscription_duration,
        status: user.subscription_status,
        start_date: user.subscription_start_date,
        end_date: user.subscription_end_date,
        amount: user.subscription_amount,
        address: user.subscription_address,
        building_name: user.subscription_building_name,
        flat_number: user.subscription_flat_number,
        payment_id: user.subscription_payment_id
      };
    }

    res.json({
      subscription,
      hasActiveSubscription: subscription?.status === "active"
    });
  } catch (error) {
    console.error("Fetch subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get Detailed Subscription Info by Username
router.get("/details/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // First check if user exists
    const [userRows] = await query(
      "SELECT id, username, email, name, phone FROM users WHERE username = ? OR email = ?",
      [username, username]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userRows[0];

    // ✅ Check subscriptions table (make sure table exists!)
    const [subscriptionRows] = await query(
      `
      SELECT s.*,
             DATEDIFF(s.end_date, CURDATE()) as remaining_days,
             DATEDIFF(s.end_date, s.created_at) as total_days
      FROM subscriptions s
      WHERE s.username = ?
      ORDER BY 
        CASE WHEN s.status = 'active' THEN 1 ELSE 0 END DESC,
        CASE WHEN s.status = 'paused' THEN 1 ELSE 0 END DESC,
        s.created_at DESC
      LIMIT 1
    `,
      [username]
    );

    let subscription = null;
    let analytics = null;

    if (subscriptionRows.length > 0) {
      const sub = subscriptionRows[0];
      const endDate = new Date(sub.end_date);
      const today = new Date();
      const diffTime = endDate - today;
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const remainingDaysDisplay = remainingDays < 0 ? 0 : remainingDays;

      const startDate = new Date(sub.created_at);
      const totalDays =
        sub.total_days ||
        Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const usedDays = totalDays - remainingDaysDisplay;
      const usagePercentage =
        totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0;

      subscription = {
        id: sub.id,
        subscription_type: sub.subscription_type,
        subscription_duration: sub.duration,
        subscription_status: sub.status,
        subscription_start_date: sub.created_at,
        subscription_end_date: sub.end_date,
        subscription_amount: sub.amount,
        subscription_address: sub.address,
        subscription_building_name: sub.building_name,
        subscription_flat_number: sub.flat_number,
        subscription_payment_id: sub.payment_id,
        remaining_days: remainingDaysDisplay,
        total_days: totalDays,
        used_days: usedDays,
        usage_percentage: usagePercentage,
        is_expired: remainingDays < 0,
        is_active: sub.status === "active" && remainingDays >= 0,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
        paused_at: sub.paused_at,
        resumed_at: sub.resumed_at,
        total_paused_days: sub.total_paused_days
      };

      analytics = {
        total_subscriptions: 1,
        active_subscriptions:
          sub.status === "active" && remainingDays >= 0 ? 1 : 0,
        paused_subscriptions: sub.status === "paused" ? 1 : 0,
        cancelled_subscriptions: sub.status === "cancelled" ? 1 : 0,
        expired_subscriptions: remainingDays < 0 ? 1 : 0,
        total_amount_spent: parseFloat(sub.amount || 0),
        average_subscription_length: totalDays,
        current_streak_days: sub.status === "active" ? remainingDaysDisplay : 0
      };
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        phone: user.phone
      },
      subscription,
      analytics,
      hasActiveSubscription: subscription?.is_active || false
    });
  } catch (error) {
    console.error("Fetch detailed subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Pause Subscription
router.post("/:username/pause", async (req, res) => {
  try {
    const { username } = req.params;

    await query(
      `UPDATE users SET subscription_status = 'paused', subscription_updated_at = NOW() WHERE username = ? OR email = ?`,
      [username, username]
    );

    res.json({ success: true, message: "Subscription paused successfully" });
  } catch (error) {
    console.error("Pause subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Resume Subscription
router.post("/:username/resume", async (req, res) => {
  try {
    const { username } = req.params;

    await query(
      `UPDATE users SET subscription_status = 'active', subscription_updated_at = NOW() WHERE username = ? OR email = ?`,
      [username, username]
    );

    res.json({ success: true, message: "Subscription resumed successfully" });
  } catch (error) {
    console.error("Resume subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Cancel Subscription
router.post("/:username/cancel", async (req, res) => {
  try {
    const { username } = req.params;

    await query(
      `UPDATE users SET subscription_status = 'cancelled', subscription_updated_at = NOW() WHERE username = ? OR email = ?`,
      [username, username]
    );

    res.json({ success: true, message: "Subscription cancelled successfully" });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Extend Subscription
router.post("/:username/extend", async (req, res) => {
  try {
    const { username } = req.params;
    const { days, amount } = req.body;

    if (!days || days <= 0) {
      return res.status(400).json({ error: "Valid number of days required" });
    }

    const [rows] = await query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, username]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    if (!user.subscription_type || user.subscription_status !== "active") {
      return res.status(400).json({ error: "No active subscription to extend" });
    }

    await query(
      `UPDATE users SET
        subscription_end_date = DATE_ADD(subscription_end_date, INTERVAL ? DAY),
        subscription_amount = subscription_amount + ?,
        subscription_updated_at = NOW()
      WHERE username = ? OR email = ?`,
      [days, amount || 0, username, username]
    );

    res.json({ success: true, message: `Subscription extended by ${days} days` });
  } catch (error) {
    console.error("Extend subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Update Subscription Details
router.put("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { address, building_name, flat_number } = req.body;

    await query(
      `UPDATE users SET
        subscription_address = ?,
        subscription_building_name = ?,
        subscription_flat_number = ?,
        subscription_updated_at = NOW()
      WHERE username = ? OR email = ?`,
      [address, building_name, flat_number, username, username]
    );

    res.json({ success: true, message: "Subscription details updated successfully" });
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Get Subscription Statistics
router.get("/stats/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const [rows] = await query(
      "SELECT * FROM users WHERE username = ? OR email = ?",
      [username, username]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    const stats = {
      user_id: user.id,
      username: user.username,
      has_subscription: !!user.subscription_type,
      subscription_status: user.subscription_status,
      subscription_type: user.subscription_type,
      total_amount_spent: parseFloat(user.subscription_amount || 0),
      subscription_created: user.subscription_created_at,
      last_updated: user.subscription_updated_at
    };

    if (user.subscription_type) {
      const endDate = new Date(user.subscription_end_date);
      const today = new Date();
      const diffTime = endDate - today;
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      stats.remaining_days = remainingDays < 0 ? 0 : remainingDays;
      stats.is_expired = remainingDays < 0;
      stats.is_active = user.subscription_status === "active" && remainingDays >= 0;
      stats.subscription_end_date = user.subscription_end_date;
    }

    res.json(stats);
  } catch (error) {
    console.error("Get subscription stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
