// routes/apiRoutes-complete-fixed.js
const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const db = require("../models"); // ✅ Import database connection and models

// ✅ Debug: Check DB connection
if (!db || !db.User) {
  console.error("❌ Database not initialized or User model missing");
}

// ✅ Register / Signup route
router.post("/signup", async (req, res) => {
  try {
    console.log("📥 Signup request received:", req.body);

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if user already exists
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.User.create({
      username,
      email,
      password: hashedPassword,
    });

    console.log("✅ New user registered:", newUser.email);
    return res.status(201).json({ message: "Signup successful!" });
  } catch (error) {
    console.error("💥 Signup error:", error);
    return res.status(500).json({ message: "Server error during signup." });
  }
});

// ✅ Login route
router.post("/login", async (req, res) => {
  try {
    console.log("📥 POST /api/login - Full body:", req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    console.log("🔍 Searching for user:", username);

    // Search user by email or username
    const user = await db.User.findOne({
      where: { email: username },
    });

    if (!user) {
      console.log("❌ No user found with email:", username);
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.password) {
      console.error("⚠️ User record incomplete or missing password:", user);
      return res.status(400).json({ message: "User record incomplete." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Invalid password for user:", username);
      return res.status(401).json({ message: "Invalid credentials." });
    }

    console.log("✅ Login successful for:", username);
    return res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (error) {
    console.error("💥 Login error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
});

// ✅ Example route: Get all products
router.get("/products", async (req, res) => {
  try {
    const products = await db.Product.findAll();
    res.json(products);
  } catch (error) {
    console.error("💥 Error fetching products:", error);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// ✅ Example route: Get all subscriptions
router.get("/subscriptions", async (req, res) => {
  try {
    const subs = await db.Subscription.findAll({
      include: [{ model: db.User, attributes: ["username", "email"] }],
    });
    res.json(subs);
  } catch (error) {
    console.error("💥 Error fetching subscriptions:", error);
    res.status(500).json({ message: "Error fetching subscriptions" });
  }
});

module.exports = router;
