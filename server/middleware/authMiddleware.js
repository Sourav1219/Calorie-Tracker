const jwt = require("jsonwebtoken");

/**
 * Auth middleware — verifies JWT from Authorization header.
 * Attaches decoded payload to req.user if valid.
 * Returns 401 if token is missing or invalid.
 */
const authMiddleware = (req, res, next) => {
  // Prefer the httpOnly cookie; fall back to the Authorization header
  // (keeps API tools / any legacy Bearer clients working).
  const token =
    req.cookies?.token || req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
