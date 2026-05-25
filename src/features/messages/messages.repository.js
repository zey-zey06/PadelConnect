const db = require('../../db');

async function getConversations(userId) {
  const result = await db.raw(`
    SELECT
      partner.id              AS partner_id,
      partner.first_name,
      partner.last_name,
      partner.email,
      pp.photo_url,
      lm.content              AS last_content,
      lm.created_at           AS last_at,
      lm.sender_id            AS last_sender_id,
      COALESCE(unread.cnt, 0) AS unread_count
    FROM (
      SELECT DISTINCT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
    ) convs
    JOIN users partner ON partner.id = convs.partner_id
    LEFT JOIN player_profiles pp
      ON pp.user_id = convs.partner_id AND pp.deleted_at IS NULL
    JOIN LATERAL (
      SELECT content, created_at, sender_id
      FROM messages
      WHERE (sender_id = ? AND receiver_id = convs.partner_id)
         OR (sender_id = convs.partner_id AND receiver_id = ?)
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::integer AS cnt
      FROM messages
      WHERE sender_id = convs.partner_id
        AND receiver_id = ?
        AND read = false
    ) unread ON true
    ORDER BY lm.created_at DESC
  `, [userId, userId, userId, userId, userId, userId]);

  return result.rows;
}

async function getMessagesBetween(userId, partnerId) {
  return db('messages')
    .where(function () {
      this.where({ sender_id: userId, receiver_id: partnerId })
          .orWhere({ sender_id: partnerId, receiver_id: userId });
    })
    .orderBy('created_at', 'asc')
    .select('*');
}

async function createMessage(senderId, receiverId, content) {
  const [msg] = await db('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content })
    .returning('*');
  return msg;
}

async function markAsRead(userId, partnerId) {
  await db('messages')
    .where({ sender_id: partnerId, receiver_id: userId, read: false })
    .update({ read: true });
}

async function getUnreadCount(userId) {
  const [{ count }] = await db('messages')
    .where({ receiver_id: userId, read: false })
    .count('id as count');
  return parseInt(count, 10);
}

module.exports = { getConversations, getMessagesBetween, createMessage, markAsRead, getUnreadCount };
