const db = require('../../db');

async function create(data) {
  const row = {
    user_id: data.user_id,
    type: data.type,
    message: data.message,
    read: false,
    created_at: new Date(),
  };
  if (data.actor_id) row.actor_id = data.actor_id;
  if (data.metadata) row.metadata = JSON.stringify(data.metadata);
  const [result] = await db('notifications').insert(row).returning('*');
  return result;
}

async function getById(id) {
  return db('notifications').where({ id }).first();
}

async function getAll(userId) {
  return db('notifications')
    .where({ user_id: userId })
    .orderBy('created_at', 'desc')
    .select();
}

async function getUnread(userId) {
  return db('notifications')
    .where({ user_id: userId, read: false })
    .orderBy('created_at', 'desc')
    .select();
}

async function markAsRead(id) {
  const [row] = await db('notifications')
    .where({ id })
    .update({ read: true })
    .returning('*');
  return row;
}

module.exports = { create, getById, getAll, getUnread, markAsRead };
