const { randomUUID } = require("crypto");

function requestContext(req, res, next) {
  const incomingRequestId = req.headers["x-request-id"];
  req.id = typeof incomingRequestId === "string" && incomingRequestId.trim()
    ? incomingRequestId.trim()
    : randomUUID();

  res.setHeader("X-Request-Id", req.id);
  next();
}

module.exports = requestContext;
