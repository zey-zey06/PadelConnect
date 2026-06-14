const db = require('../../db');

async function findOrCreateChat(teamId, clubId) {
  const existing = await db('team_club_chats')
    .where({ team_id: teamId, club_id: clubId })
    .first();
  if (existing) return existing;
  const [chat] = await db('team_club_chats')
    .insert({ team_id: teamId, club_id: clubId })
    .returning('*');
  return chat;
}

async function getChatById(chatId) {
  return db('team_club_chats').where({ id: chatId }).first();
}

async function getChatsForTeam(teamId) {
  return db('team_club_chats as c')
    .join('organizations as o', 'o.id', 'c.club_id')
    .where('c.team_id', teamId)
    .leftJoin(
      db('team_club_messages').select('chat_id')
        .max('created_at as last_at').groupBy('chat_id').as('lm'),
      'lm.chat_id', 'c.id',
    )
    .select(
      'c.id', 'c.team_id', 'c.club_id', 'c.created_at',
      'o.name as club_name', 'o.logo_url as club_logo',
      'lm.last_at',
    )
    .orderBy('lm.last_at', 'desc');
}

async function getChatsForClub(orgId) {
  return db('team_club_chats as c')
    .join('teams as t', 't.id', 'c.team_id')
    .where('c.club_id', orgId)
    .leftJoin(
      db('team_club_messages').select('chat_id')
        .max('created_at as last_at').groupBy('chat_id').as('lm'),
      'lm.chat_id', 'c.id',
    )
    .select(
      'c.id', 'c.team_id', 'c.club_id', 'c.created_at',
      't.name as team_name', 't.logo_url as team_logo',
      'lm.last_at',
    )
    .orderBy('lm.last_at', 'desc');
}

async function getMessages(chatId) {
  return db('team_club_messages as m')
    .join('users as u', 'u.id', 'm.sender_id')
    .where('m.chat_id', chatId)
    .select(
      'm.id', 'm.chat_id', 'm.sender_id', 'm.sender_type', 'm.content', 'm.created_at',
      db.raw("TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) as sender_name"),
    )
    .orderBy('m.created_at', 'asc');
}

async function addMessage(chatId, senderId, senderType, content) {
  const [msg] = await db('team_club_messages')
    .insert({ chat_id: chatId, sender_id: senderId, sender_type: senderType, content: content.trim() })
    .returning('*');
  return msg;
}

async function getClubAdminUsers(orgId) {
  return db('users').where({ organization_id: orgId, role: 'venue_admin' }).select('id');
}

async function getTeamAdminUsers(teamId) {
  return db('team_members as tm')
    .join('users as u', 'u.id', 'tm.user_id')
    .where({ 'tm.team_id': teamId, 'tm.role': 'admin', 'tm.status': 'active' })
    .select('u.id');
}

module.exports = {
  findOrCreateChat, getChatById, getChatsForTeam, getChatsForClub,
  getMessages, addMessage, getClubAdminUsers, getTeamAdminUsers,
};
