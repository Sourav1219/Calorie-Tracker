const jwt = require("jsonwebtoken");

/**
 * Auth middleware — verifies JWT from Authorization header.
 * Attaches decoded payload to req.user if valid.
 * Returns 401 if token is missing or invalid.
 */
const authMiddleware = (req, res, next) => {
  try {
    // Read header
    const authHeader = req.headers.authorization;

    // Check it starts with "Bearer "
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user payload
    req.user = decoded;

    // Call next
    next();
  } catch (error) {
    // If it throws
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
