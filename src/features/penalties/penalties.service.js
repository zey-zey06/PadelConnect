const penaltiesRepo = require('./penalties.repository');
const notificationsService = require('../notifications/notifications.service');
const { getConfig, updateConfig } = require('../../config/penalties');

function makeError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function getMyPenalties(userId) {
  return penaltiesRepo.getByUser(userId);
}

async function payPenalty(penaltyId, userId) {
  const penalty = await penaltiesRepo.getById(penaltyId);
  if (!penalty) throw makeError(404, 'Pénalité introuvable.');
  if (penalty.user_id !== userId) throw makeError(403, 'Accès refusé.');
  return penaltiesRepo.markPaid(penaltyId);
}

async function createAppBan(targetUserId, reason) {
  const ban = await penaltiesRepo.create({
    user_id: targetUserId,
    type: 'app_ban',
    organization_id: null,
    amount: 0,
    paid: false,
    reason: reason || null,
  });

  // Notify the banned user — AFTER DB op
  await notificationsService.createNotification(
    targetUserId,
    'app_ban',
    'Votre compte a été suspendu. Réglez vos pénalités pour le débloquer.'
  );

  return ban;
}

function getPenaltiesConfig() {
  return getConfig();
}

function updatePenaltiesConfig(updates) {
  return updateConfig(updates);
}

module.exports = {
  getMyPenalties,
  payPenalty,
  createAppBan,
  getPenaltiesConfig,
  updatePenaltiesConfig,
};
