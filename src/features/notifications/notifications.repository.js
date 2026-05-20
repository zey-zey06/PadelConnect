const db = require('../../db');

async function create(data) {
  const [row] = await db('notifications')
    .insert({
      user_id: data.user_id,
      type: data.type,
      message: data.message,
      read: false,
      created_at: new Date(),
    })
    .returning('*');
  return row;
}

async function getById(id) {
  return db('notifications').where({ id }).first();
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

module.exports = { create, getById, getUnread, markAsRead };
