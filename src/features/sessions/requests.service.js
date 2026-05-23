const { matchScore } = require('../../ai/match-score');
const sessionsRepo = require('./sessions.repository');
const requestsRepo = require('./requests.repository');
const profileRepo = require('../profiles/profile.repository');
const notificationsService = require('../notifications/notifications.service');

/**
 * Create a player join request OR a creator-initiated coach invite.
 *
 * @param {string} sessionId
 * @param {string} userId       - the caller (player joining, or creator inviting a coach)
 * @param {object} opts
 * @param {'player'|'coach'} opts.role
 * @param {string|null}      opts.coachUserId - required when role === 'coach'
 */
async function createRequest(sessionId, userId, { role = 'player', coachUserId = null } = {}) {
  const session = await sessionsRepo.getById(sessionId);
  if (!session) {
    const err = new Error('Session introuvable.');
    err.status = 404;
    throw err;
  }

  // ── Coach invite (sent by session creator) ──────────────────────────────────
  if (role === 'coach') {
    if (session.creator_id !== userId) {
      const err = new Error('Seul le créateur peut inviter des coachs.');
      err.status = 403;
      throw err;
    }
    if (!coachUserId) {
      const err = new Error('coach_user_id requis pour inviter un coach.');
      err.status = 422;
      throw err;
    }
    const existing = await requestsRepo.findBySessionAndPlayer(sessionId, coachUserId);
    if (existing) {
      const err = new Error('Ce coach a déjà été invité pour cette session.');
      err.status = 409;
      throw err;
    }
    const sessionRequest = await requestsRepo.create({
      session_id:     sessionId,
      player_id:      coachUserId,
      role:           'coach',
      ai_score:       null,
      ai_explanation: null,
    });
    await notificationsService.createNotification(
      coachUserId,
      'coach_invite',
      `Vous avez été invité à coacher une session du ${session.date} à ${session.time?.slice(0, 5)}.`
    );
    return sessionRequest;
  }

  // ── Player join request ─────────────────────────────────────────────────────
  if (session.creator_id === userId) {
    const err = new Error('Vous ne pouvez pas rejoindre votre propre session.');
    err.status = 403;
    throw err;
  }

  const existing = await requestsRepo.findBySessionAndPlayer(sessionId, userId);
  if (existing) {
    const err = new Error('Vous avez déjà envoyé une demande pour cette session.');
    err.status = 409;
    throw err;
  }

  // Fetch profiles for AI scoring (errors here must not block request creation)
  let candidateProfile = null;
  let acceptedProfiles = [];
  try {
    candidateProfile = await profileRepo.getByUserId(userId);
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
    session_id:     sessionId,
    player_id:      userId,
    role:           'player',
    ai_score:       score,
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
  // Only players count toward the session headcount — coaches/ball-pickers are service providers
  if (status === 'accepted' && sessionRequest.role === 'player') {
    const newCount = session.current_players + 1;
    const updatedSession = await sessionsRepo.updateCurrentPlayers(sessionId, newCount);
    if (updatedSession.current_players >= session.max_players) {
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
      `Votre session est complète ! ${session.max_players} joueurs confirmés.`
    );
  }

  return updatedRequest;
}

module.exports = { createRequest, getRequests, respondToRequest };
