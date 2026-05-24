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

module.exports = { create, list, listWithStats, getUserById, getAdminByOrg, getById, linkUserToOrg, update, getBallPickersByOrg, createBallPicker, removeBallPicker };
