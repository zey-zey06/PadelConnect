const db = require('../../db');

async function getMessages(sessionId) {
  return db('session_messages')
    .join('users', 'session_messages.user_id', 'users.id')
    .where('session_messages.session_id', sessionId)
    .orderBy('session_messages.created_at', 'asc')
    .select(
      'session_messages.id',
      'session_messages.content',
      'session_messages.created_at',
      'users.id       as user_id',
      'users.first_name as user_first_name',
      'users.last_name  as user_last_name',
      'users.username   as user_username',
    );
}

async function createMessage(sessionId, userId, content) {
  const [row] = await db('session_messages')
    .insert({ session_id: sessionId, user_id: userId, content })
    .returning('id');

  return db('session_messages')
    .join('users', 'session_messages.user_id', 'users.id')
    .where('session_messages.id', row.id)
    .select(
      'session_messages.id',
      'session_messages.content',
      'session_messages.created_at',
      'users.id       as user_id',
      'users.first_name as user_first_name',
      'users.last_name  as user_last_name',
      'users.username   as user_username',
    )
    .first();
}

module.exports = { getMessages, createMessage };
