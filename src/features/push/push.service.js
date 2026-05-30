const webpush = require('web-push');
const db       = require('../../db');

const VAPID_EMAIL  = process.env.VAPID_EMAIL       || 'mailto:admin@padelconnect.ci';
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY  || null;
const VAPID_SECRET = process.env.VAPID_SECRET_KEY  || null;

if (VAPID_PUBLIC && VAPID_SECRET) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_SECRET);
}

function isConfigured() {
  return !!(VAPID_PUBLIC && VAPID_SECRET);
}

function getPublicKey() {
  return VAPID_PUBLIC;
}

async function saveSubscription(userId, { endpoint, keys }) {
  const { p256dh, auth } = keys ?? {};
  if (!endpoint || !p256dh || !auth) return;

  await db('push_subscriptions')
    .insert({ user_id: userId, endpoint, p256dh, auth })
    .onConflict(['user_id', 'endpoint'])
    .merge({ p256dh, auth });
}

async function sendPushToUser(userId, payload) {
  if (!isConfigured()) return;

  const subs = await db('push_subscriptions').where({ user_id: userId }).select();
  if (!subs.length) return;

  const body = JSON.stringify(payload);
  const dead = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 86400 },
        );
      } catch (err) {
        // 404/410 means the subscription has expired — clean it up
        if (err.statusCode === 404 || err.statusCode === 410) {
          dead.push(sub.id);
        }
      }
    })
  );

  if (dead.length) {
    await db('push_subscriptions').whereIn('id', dead).delete().catch(() => {});
  }
}

module.exports = { isConfigured, getPublicKey, saveSubscription, sendPushToUser };
