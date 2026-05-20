const db = require('../../db');

async function getByUser(userId) {
  return db('penalties')
    .where({ user_id: userId })
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc')
    .select();
}

async function getById(id) {
  return db('penalties')
    .where({ id })
    .whereNull('deleted_at')
    .first();
}

async function create(data) {
  const [penalty] = await db('penalties')
    .insert({
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning('*');
  return penalty;
}

async function markPaid(id) {
  const [penalty] = await db('penalties')
    .where({ id })
    .update({ paid: true, updated_at: new Date() })
    .returning('*');
  return penalty;
}

async function getActiveAppBan(userId) {
  return db('penalties')
    .where({ user_id: userId, type: 'app_ban', paid: false })
    .whereNull('deleted_at')
    .first();
}

async function getActiveClubBan(userId, organizationId) {
  return db('penalties')
    .where({ user_id: userId, type: 'club_ban', organization_id: organizationId, paid: false })
    .whereNull('deleted_at')
    .first();
}

async function countLateCancelsByUser(userId) {
  const rows = await db('no_show_records')
    .where({ user_id: userId, type: 'late_cancel' })
    .whereNull('deleted_at')
    .select('id');
  return rows.length;
}

module.exports = {
  getByUser,
  getById,
  create,
  markPaid,
  getActiveAppBan,
  getActiveClubBan,
  countLateCancelsByUser,
};
