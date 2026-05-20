const { matchScore } = require('../../ai/match-score');
const sessionsRepo = require('./sessions.repository');
const requestsRepo = require('./requests.repository');
const profileRepo = require('../profiles/profile.repository');
const notificationsService = require('../notifications/notifications.service');

async function createRequest(sessionId, playerId) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }

  if (session.creator_id === playerId) {
    const err = new Error('Vous ne pouvez pas rejoindre votre propre session.');
    err.status = 403;
    throw err;
  }

  const existing = await requestsRepo.findBySessionAndPlayer(sessionId, playerId);
  if (existing) {
    const err = new Error('Vous avez déjà envoyé une demande pour cette session.');
    err.status = 409;
    throw err;
  }

  // Fetch profiles for AI scoring (errors here must not block request creation)
  let candidateProfile = null;
  let acceptedProfiles = [];
  try {
    candidateProfile = await profileRepo.getByUserId(playerId);
    const acceptedRequests = await requestsRepo.getAcceptedBySession(sessionId);
    acceptedProfiles = (
      await Promise.all(acceptedRequests.map((r) => profileRepo.getByUserId(r.player_id)))
    ).filter(Boolean);
  } catch {
    // Profile fetch failure is non-fatal — AI will use degraded score
  }

  const { score, explication } = await matchScore({
    candidateProfile,
    acceptedProfiles,
    sessionPreferences: session.preferences,
  });

  const sessionRequest = await requestsRepo.create({
    session_id: sessionId,
    player_id: playerId,
    ai_score: score,
    ai_explanation: explication,
  });

  // Notify session creator of new request — AFTER all DB ops
  await notificationsService.createNotification(
    session.creator_id,
    'session_request',
    `Nouvelle demande pour rejoindre votre session du ${session.date}.`
  );

  return sessionRequest;
}

async function getRequests(sessionId, userId) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }
  if (session.creator_id !== userId) {
    const err = new Error('Accès refusé. Seul le créateur peut voir les demandes.');
    err.status = 403;
    throw err;
  }
  return requestsRepo.getBySession(sessionId);
}

async function respondToRequest(sessionId, requestId, userId, status) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }
  if (session.creator_id !== userId) {
    const err = new Error('Accès refusé. Seul le créateur peut répondre aux demandes.');
    err.status = 403;
    throw err;
  }

  const sessionRequest = await requestsRepo.getById(requestId);
  if (!sessionRequest || sessionRequest.session_id !== sessionId) {
    const err = new Error('Demande introuvable.');
    err.status = 404;
    throw err;
  }

  const updatedRequest = await requestsRepo.updateStatus(requestId, status);

  let sessionBecameComplete = false;
  if (status === 'accepted') {
    const newCount = session.current_players + 1;
    const updatedSession = await sessionsRepo.updateCurrentPlayers(sessionId, newCount);
    if (updatedSession.current_players >= 2) {
      await sessionsRepo.updateStatus(sessionId, 'complete');
      sessionBecameComplete = true;
    }
  }

  // Notifications AFTER all DB ops
  await notificationsService.createNotification(
    sessionRequest.player_id,
    status === 'accepted' ? 'request_accepted' : 'request_refused',
    status === 'accepted'
      ? 'Votre demande de session a été acceptée !'
      : 'Votre demande de session a été refusée.'
  );

  if (sessionBecameComplete) {
    await notificationsService.createNotification(
      session.creator_id,
      'session_complete',
      'Votre session est complète ! 2 joueurs confirmés.'
    );
  }

  return updatedRequest;
}

module.exports = { createRequest, getRequests, respondToRequest };
