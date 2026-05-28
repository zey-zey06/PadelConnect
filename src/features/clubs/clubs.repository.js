const db = require('../../db');

async function create(data) {
  const [row] = await db('organizations').insert(data).returning('*');
  return row;
}

async function list() {
  return db('organizations').whereNull('deleted_at').orderBy('name', 'asc').select();
}

async function getById(id) {
  return db('organizations').where({ id }).whereNull('deleted_at').first();
}

async function listWithStats() {
  return db('organizations')
    .whereNull('organizations.deleted_at')
    .where(function () {
      this.where('organizations.subscription_status', 'active')
        .orWhere(function () {
          this.where('organizations.subscription_status', 'trial')
            .whereRaw('organizations.trial_ends_at > NOW()');
        });
    })
    .orderBy('organizations.name', 'asc')
    .select([
      'organizations.*',
      db.raw(`(
        SELECT COUNT(*)::int FROM venues v
        WHERE v.organization_id = organizations.id AND v.deleted_at IS NULL
      ) AS venue_count`),
      db.raw(`(
        SELECT MIN(vs.price) FROM venue_slots vs
        JOIN venues v2 ON vs.venue_id = v2.id
        WHERE v2.organization_id = organizations.id
          AND v2.deleted_at IS NULL
          AND vs.deleted_at IS NULL
          AND vs.status = 'available'
      ) AS min_price`),
      db.raw(`(
        SELECT MAX(vs.price) FROM venue_slots vs
        JOIN venues v2 ON vs.venue_id = v2.id
        WHERE v2.organization_id = organizations.id
          AND v2.deleted_at IS NULL
          AND vs.deleted_at IS NULL
          AND vs.status = 'available'
      ) AS max_price`),
    ]);
}

async function getUserById(id) {
  return db('users').where({ id }).first();
}

async function getAdminByOrg(organizationId) {
  return db('users')
    .where({ organization_id: organizationId, role: 'venue_admin' })
    .whereNull('deleted_at')
    .first();
}

async function linkUserToOrg(userId, organizationId) {
  const [row] = await db('users')
    .where({ id: userId })
    .update({ organization_id: organizationId, updated_at: new Date() })
    .returning('*');
  return row;
}

async function update(id, data) {
  const [row] = await db('organizations')
    .where({ id })
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return row;
}

async function getBallPickersByOrg(organizationId) {
  return db('users')
    .where({ organization_id: organizationId, role: 'ball_picker' })
    .whereNull('deleted_at')
    .orderBy('created_at', 'asc')
    .select(
      'id         as user_id',
      'first_name as user_first_name',
      'last_name  as user_last_name',
      'email      as user_email',
      'phone      as user_phone',
    );
}

async function createBallPicker(data) {
  const [row] = await db('users').insert(data).returning([
    'id', 'first_name', 'last_name', 'email', 'phone', 'role', 'organization_id',
  ]);
  return {
    user_id:         row.id,
    user_first_name: row.first_name,
    user_last_name:  row.last_name,
    user_email:      row.email,
    user_phone:      row.phone,
  };
}

async function removeBallPicker(userId) {
  const [row] = await db('users')
    .where({ id: userId, role: 'ball_picker' })
    .update({ deleted_at: new Date(), updated_at: new Date() })
    .returning('id');
  return row;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

async function addFavorite(userId, orgId) {
  await db('club_favorites').insert({ user_id: userId, organization_id: orgId }).onConflict(['user_id', 'organization_id']).ignore();
}

async function removeFavorite(userId, orgId) {
  await db('club_favorites').where({ user_id: userId, organization_id: orgId }).delete();
}

async function isFavorite(userId, orgId) {
  const row = await db('club_favorites').where({ user_id: userId, organization_id: orgId }).first();
  return !!row;
}

async function getFavoritesByUser(userId) {
  return db('club_favorites')
    .join('organizations', 'club_favorites.organization_id', 'organizations.id')
    .where({ 'club_favorites.user_id': userId })
    .whereNull('organizations.deleted_at')
    .select('organizations.*', 'club_favorites.created_at as favorited_at');
}

async function getFavoritesCount(orgId) {
  const [{ count }] = await db('club_favorites').where({ organization_id: orgId }).count('id as count');
  return parseInt(count, 10);
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

async function addSubscription(userId, orgId) {
  await db('club_subscriptions').insert({ user_id: userId, organization_id: orgId }).onConflict(['user_id', 'organization_id']).ignore();
}

async function removeSubscription(userId, orgId) {
  await db('club_subscriptions').where({ user_id: userId, organization_id: orgId }).delete();
}

async function isSubscribed(userId, orgId) {
  const row = await db('club_subscriptions').where({ user_id: userId, organization_id: orgId }).first();
  return !!row;
}

async function getSubscribersCount(orgId) {
  const [{ count }] = await db('club_subscriptions').where({ organization_id: orgId }).count('id as count');
  return parseInt(count, 10);
}

async function getSubscriberIds(orgId) {
  const rows = await db('club_subscriptions').where({ organization_id: orgId }).select('user_id');
  return rows.map((r) => r.user_id);
}

async function getSubscribers(orgId) {
  return db('users')
    .join('club_subscriptions', 'users.id', '=', 'club_subscriptions.user_id')
    .where({ 'club_subscriptions.organization_id': orgId })
    .select(
      'users.id',
      'users.email',
      'users.first_name',
      'users.last_name',
      'users.photo_url',
      'club_subscriptions.created_at as subscribed_at'
    )
    .orderBy('club_subscriptions.created_at', 'desc');
}

// ── Posts ─────────────────────────────────────────────────────────────────────

async function createPost(data) {
  const [row] = await db('club_posts').insert(data).returning('*');
  return row;
}

async function getPostsByOrg(orgId) {
  return db('club_posts')
    .where({ organization_id: orgId })
    .orderBy('created_at', 'desc')
    .select();
}

async function deletePost(postId, orgId) {
  await db('club_posts').where({ id: postId, organization_id: orgId }).delete();
}

module.exports = {
  create, list, listWithStats, getUserById, getAdminByOrg, getById, linkUserToOrg, update,
  getBallPickersByOrg, createBallPicker, removeBallPicker,
  addFavorite, removeFavorite, isFavorite, getFavoritesByUser, getFavoritesCount,
  addSubscription, removeSubscription, isSubscribed, getSubscribersCount, getSubscriberIds, getSubscribers,
  createPost, getPostsByOrg, deletePost,
};
