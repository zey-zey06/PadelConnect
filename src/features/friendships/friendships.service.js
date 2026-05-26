const repo                  = require('./friendships.repository');
const notificationsService  = require('../notifications/notifications.service');
const db                    = require('../../db');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function displayName(userId) {
  const u = await db('users').where({ id: userId }).select('first_name', 'last_name', 'username').first();
  if (!u) return 'Un joueur';
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Un joueur';
}

/**
 * Send a friend request from requesterId → addresseeId.
 * Notifies the addressee.
 */
async function sendRequest(requesterId, addresseeId) {
  if (requesterId === addresseeId) {
    throw makeError(400, 'Vous ne pouvez pas vous ajouter vous-même en ami.');
  }
  const friendship = await repo.sendRequest(requesterId, addresseeId);

  // Non-blocking notification — carry actor_id so the UI can show Accept/Refuse
  displayName(requesterId).then((name) =>
    notificationsService.createNotification(
      addresseeId,
      'friend_request',
      `${name} vous a envoyé une demande d'ami.`,
      requesterId,
    )
  ).catch(() => {});

  return friendship;
}

/**
 * Accept a friend request.
 * currentUserId must be the addressee of the original request.
 */
async function acceptRequest(currentUserId, requesterId) {
  const row = await repo.accept(requesterId, currentUserId);
  if (!row) throw makeError(404, 'Demande d\'ami introuvable.');

  // Notify the requester
  displayName(currentUserId).then((name) =>
    notificationsService.createNotification(
      requesterId,
      'friend_accepted',
      `${name} a accepté votre demande d'ami.`,
    )
  ).catch(() => {});

  return row;
}

/**
 * Refuse a friend request.
 * currentUserId must be the addressee.
 */
async function refuseRequest(currentUserId, requesterId) {
  const row = await repo.refuse(requesterId, currentUserId);
  if (!row) throw makeError(404, 'Demande d\'ami introuvable.');
  return row;
}

/**
 * Unfriend — remove an accepted friendship.
 */
async function unfriend(userId, otherUserId) {
  await repo.remove(userId, otherUserId);
}

async function getStatus(userId, otherUserId) {
  return repo.getStatus(userId, otherUserId);
}

async function getFriends(userId) {
  return repo.getFriends(userId);
}

async function getPendingRequests(userId) {
  return repo.getPendingRequests(userId);
}

module.exports = {
  sendRequest,
  acceptRequest,
  refuseRequest,
  unfriend,
  getStatus,
  getFriends,
  getPendingRequests,
};
