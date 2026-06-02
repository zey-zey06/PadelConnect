import { getVapidKey, subscribePush } from '@/api/push';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Register the service worker and subscribe to push notifications.
 * Call once after the user is authenticated.
 * All errors are swallowed — push is a best-effort enhancement.
 */
export async function registerPushSubscription() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const { enabled, publicKey } = await getVapidKey();
    if (!enabled || !publicKey) return;

    // Don't re-ask if the user already denied
    if (Notification.permission === 'denied') return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;

    // Re-use existing subscription if already registered
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await subscribePush(sub.toJSON());
  } catch {
    // Push failure must never block the app
  }
}
