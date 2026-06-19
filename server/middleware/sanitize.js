/**
 * Strips MongoDB operator-injection vectors from incoming request data.
 *
 * Any object key that starts with "$" (e.g. {$gt: ""}) or contains a "."
 * (dotted-path injection) is removed before the value ever reaches a query.
 * This blocks NoSQL operator injection without relying on
 * express-mongo-sanitize (which is incompatible with newer Express).
 */
function scrub(value) {
  if (Array.isArray(value)) {
    return value.map(scrub);
  }
  if (value && typeof value === "object") {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        continue; // drop dangerous keys
      }
      clean[key] = scrub(value[key]);
    }
    return clean;
  }
  return value;
}

function sanitizeRequest(req, _res, next) {
  if (req.body) req.body = scrub(req.body);
  if (req.params) req.params = scrub(req.params);
  // req.query is reassigned (mutating in place can fail on some setups)
  if (req.query && Object.keys(req.query).length > 0) {
    req.query = scrub(req.query);
  }
  next();
}

module.exports = sanitizeRequest;
