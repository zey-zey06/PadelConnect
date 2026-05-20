const { matchScore } = require('../../ai/match-score');
const sessionsRepo = require('./sessions.repository');
const requestsRepo = require('./requests.repository');
const profileRepo = require('../profiles/profile.repository');

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

  return requestsRepo.create({
    session_id: sessionId,
    player_id: playerId,
    ai_score: score,
    ai_explanation: explication,
  });
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

  if (status === 'accepted') {
    const newCount = session.current_players + 1;
    const updatedSession = await sessionsRepo.updateCurrentPlayers(sessionId, newCount);
    if (updatedSession.current_players >= 2) {
      await sessionsRepo.updateStatus(sessionId, 'complete');
    }
  }

  return updatedRequest;
}

module.exports = { createRequest, getRequests, respondToRequest };
