const repo = require('./team-chats.repository');
const notificationsService = require('../notifications/notifications.service');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function assertAccess(user, chat) {
  if (user.role === 'tournament_organizer' && chat.team_id !== user.team_id) throw makeError(403, 'Accès refusé.');
  if (user.role === 'venue_admin' && chat.club_id !== user.organization_id) throw makeError(403, 'Accès refusé.');
}

async function getOrCreateChat(user, { team_id, club_id }) {
  if (user.role === 'tournament_organizer' && user.team_id !== team_id) throw makeError(403, 'Accès refusé.');
  if (user.role === 'venue_admin' && user.organization_id !== club_id) throw makeError(403, 'Accès refusé.');
  return repo.findOrCreateChat(team_id, club_id);
}

async function getMyChats(user) {
  if (user.role === 'tournament_organizer') {
    if (!user.team_id) return [];
    return repo.getChatsForTeam(user.team_id);
  }
  if (user.role === 'venue_admin') {
    return repo.getChatsForClub(user.organization_id);
  }
  return [];
}

async function getMessages(user, chatId) {
  const chat = await repo.getChatById(chatId);
  if (!chat) throw makeError(404, 'Conversation introuvable.');
  assertAccess(user, chat);
  return repo.getMessages(chatId);
}

async function sendMessage(user, chatId, content) {
  const chat = await repo.getChatById(chatId);
  if (!chat) throw makeError(404, 'Conversation introuvable.');
  assertAccess(user, chat);

  const senderType = user.role === 'venue_admin' ? 'club' : 'team';
  const msg = await repo.addMessage(chatId, user.sub, senderType, content);

  // Fire-and-forget notifications to the other party
  (async () => {
    try {
      if (senderType === 'team') {
        const admins = await repo.getClubAdminUsers(chat.club_id);
        for (const admin of admins) {
          notificationsService.createNotification(
            admin.id, 'new_message', 'Une équipe vous a envoyé un message.', user.sub,
          ).catch(() => {});
        }
      } else {
        const admins = await repo.getTeamAdminUsers(chat.team_id);
        for (const admin of admins) {
          notificationsService.createNotification(
            admin.id, 'new_message', 'Un club vous a envoyé un message.', user.sub,
          ).catch(() => {});
        }
      }
    } catch { /* non-fatal */ }
  })();

  return msg;
}

module.exports = { getOrCreateChat, getMyChats, getMessages, sendMessage };
