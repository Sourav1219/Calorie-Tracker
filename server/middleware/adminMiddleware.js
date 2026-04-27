const User = require("../models/User");

function parseAdminEmails(raw) {
  if (!raw || !raw.trim()) {
    return null;
  }

  const values = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set(values);
}

async function adminMiddleware(req, res, next) {
  try {
    const requesterId = req.user?.userId;
    const requesterEmail = req.user?.email?.toLowerCase();

    if (!requesterId || !requesterEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const requester = await User.findById(requesterId).select("isAdmin email").lean();
    if (!requester) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (requester.isAdmin) {
      return next();
    }

  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

    if (adminEmails && (adminEmails.has("*") || adminEmails.has(requesterEmail))) {
      return next();
    }

    return res.status(403).json({
      error: "Admin access required",
    });
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ error: "Unable to verify admin access" });
  }
}

module.exports = adminMiddleware;
