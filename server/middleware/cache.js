const apicache = require("apicache");

const cache = apicache.options({
  appendKey: (req) => req.originalUrl,
}).middleware;

const publicFoodCache = cache(process.env.PUBLIC_FOOD_CACHE_TTL || "10 minutes");

module.exports = {
  publicFoodCache,
};
