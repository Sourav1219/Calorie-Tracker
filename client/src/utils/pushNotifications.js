import { notificationsAPI } from "./api";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

/** Register the service worker and force an update check on every load. */
export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    reg.update();
    return reg;
  } catch (err) {
    console.error("SW registration failed:", err);
    return null;
  }
}

/** Get the current push permission state without asking. */
export function getPushPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

/** Returns the current PushSubscription or null. */
export async function getCurrentSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Subscribe to push notifications.
 * Asks for permission, gets VAPID key from server, creates subscription, saves to server.
 * Returns { ok: true } | { ok: false, reason: string }
 */
export async function subscribeToPush() {
  if (!("Notification" in window) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "denied" };
  }

  const reg = await navigator.serviceWorker.ready;

  // Fetch VAPID public key from server
  const { data } = await notificationsAPI.getVapidPublicKey();
  const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey,
  });

  await notificationsAPI.subscribePush(subscription.toJSON());
  return { ok: true };
}

/**
 * Unsubscribe from push notifications and tell the server.
 */
export async function unsubscribeFromPush() {
  const sub = await getCurrentSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  await notificationsAPI.unsubscribePush(endpoint);
}
