const webpush = require("web-push");

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send a push notification to all subscriptions for a user.
 * Removes stale subscriptions (410 Gone) automatically.
 */
async function sendPushToUser(user, payload) {
  if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) return;

  const staleEndpoints = [];

  await Promise.allSettled(
    user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (staleEndpoints.length > 0) {
    user.pushSubscriptions = user.pushSubscriptions.filter(
      (s) => !staleEndpoints.includes(s.endpoint)
    );
    await user.save();
  }
}

module.exports = { sendPushToUser };
