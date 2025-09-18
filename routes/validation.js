/**
 * Middleware: validateSubscription
 * Ensures subscription request contains required fields
 */
const validateSubscription = (req, res, next) => {
  const { productId, startDate, endDate } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      error: "Product ID is required",
    });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: "Start and End dates are required",
    });
  }

  next();
};

/**
 * Middleware: validateObjectId
 * Ensures that the provided ID param is a valid string
 * (Can adapt this to check UUIDs or integers depending on DB)
 */
const validateObjectId = (req, res, next) => {
  const { id } = req.params;

  if (!id || typeof id !== "string" || id.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Invalid or missing ID parameter",
    });
  }

  next();
};

/**
 * Global error handling middleware
 * Attach at the end of app.js
 */
const errorHandler = (err, req, res, next) => {
  console.error("Unhandled Error:", err);

  res.status(500).json({
    success: false,
    error: "Internal server error",
    details: err.message || "Unexpected error occurred",
  });
};

module.exports = {
  validateSubscription,
  validateObjectId,
  errorHandler,
};
