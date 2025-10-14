// =============================
// 📦 Milk Delivery API Routes
// =============================
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db"); // ✅ MySQL connection (using mysql2 or sequelize)

// =====================================================
// 🧠 LOGIN ROUTE
// =====================================================
router.post("/login", async (req, res) => {
  console.log("📥 POST /api/login - Origin:", req.get("origin"));
  console.log("📦 Full request body:", req.body);

  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required." });
  }

  console.log(`🔍 Searching for user: ${username}`);

  try {
    // ✅ Query user from DB (email OR username)
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1",
      [username, username]
    );

    const user = Array.isArray(rows) ? rows[0] : rows;

    if (!user) {
      console.log("❌ User not found in database");
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.password) {
      console.log("❌ User record incomplete or missing password:", user.password);
      return res.status(500).json({ error: "User record missing password." });
    }

    // ✅ Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Invalid password");
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "milk_secret_key",
      { expiresIn: "7d" }
    );

    console.log("✅ Login successful for:", user.email);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("💥 Login error:", err);
    res.status(500).json({ error: "Server error during login." });
  }
});

// =====================================================
// 🧾 REGISTER ROUTE
// =====================================================
router.post("/register", async (req, res) => {
  console.log("📥 POST /api/register - Origin:", req.get("origin"));
  console.log("📦 Full request body:", req.body);

  const { username, email, password, name, phone } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "All required fields are missing." });
  }

  try {
    // ✅ Check if email already exists
    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (username, email, password, name, phone, role) VALUES (?, ?, ?, ?, ?, 'user')",
      [username || email, email, hashedPassword, name, phone]
    );

    console.log("✅ User registered:", email);

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (err) {
    console.error("💥 Register error:", err);
    res.status(500).json({ error: "Server error during registration." });
  }
});

// =====================================================
// 🧾 GET USER PROFILE (Protected Example)
// =====================================================
router.get("/user/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ user: rows[0] });
  } catch (err) {
    console.error("💥 Error fetching user:", err);
    res.status(500).json({ error: "Server error fetching user data." });
  }
});

// =====================================================
// 🧾 SUBSCRIPTION ROUTES (Optional - Customize later)
// =====================================================
router.post("/subscribe", async (req, res) => {
  const { userId, type, duration, amount } = req.body;

  if (!userId || !type || !duration) {
    return res.status(400).json({ error: "Missing subscription details." });
  }

  try {
    const [result] = await db.query(
      "UPDATE users SET subscription_type=?, subscription_duration=?, subscription_status='active', subscription_amount=?, subscription_start_date=NOW(), subscription_end_date=DATE_ADD(NOW(), INTERVAL ? DAY) WHERE id=?",
      [type, duration, amount || 0, duration, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ message: "Subscription activated successfully!" });
  } catch (err) {
    console.error("💥 Subscription error:", err);
    res.status(500).json({ error: "Error activating subscription." });
  }
});

// =====================================================
// 🧩 HEALTH CHECK (Root API Endpoint)
// =====================================================
router.get("/", (req, res) => {
  res.json({ status: "API working fine ✅", time: new Date().toISOString() });
});

// =====================================================
// 🧱 EXPORT ROUTER
// =====================================================
module.exports = router;
