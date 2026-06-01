const { generateProfile: generateFromAI }       = require('../../ai/generate-profile');
const profileRepo                               = require('./profile.repository');
const sessionsRepo                              = require('../sessions/sessions.repository');
const adminRepo                                 = require('../admin/admin.repository');
const notificationsService                      = require('../notifications/notifications.service');
const { sendNewUserAdminNotification }          = require('../../emails/confirmation');

/**
 * Generate (or regenerate) a player profile using AI.
 *
 * Accepts either:
 *   - description  — free-text string
 *   - qa_answers   — array of { question, answer } from the PIA interview
 *
 * If motivation_answer is provided it is persisted and triggers a
 * non-blocking admin notification (in-app + email).
 */
async function generateProfile(userId, description, qaAnswers, motivationAnswer) {
  // Build the text fed to Gemini
  let text = description;
  if (!text && qaAnswers?.length) {
    text = qaAnswers
      .map((qa) => `Q: ${qa.question}\nR: ${qa.answer}`)
      .join('\n\n');
  }

  const aiResult = await generateFromAI(text);

  const profileData = {
    level:       aiResult.niveau,
    style:       aiResult.style,
    strengths:   aiResult.points_forts,
    weaknesses:  aiResult.points_faibles,
    description: aiResult.description_courte,
  };
  if (motivationAnswer) profileData.motivation_answer = motivationAnswer;

  const profile = await profileRepo.upsert(userId, profileData);

  // Non-blocking admin notifications — never block profile creation
  if (motivationAnswer) {
    notifyAdminsOfNewUser(userId, motivationAnswer).catch(() => {});
  }

  return profile;
}

/**
 * Fire-and-forget: notify every super_admin of the new inscription.
 * Failures are silently swallowed — never call this with await.
 */
async function notifyAdminsOfNewUser(userId, motivationAnswer) {
  const [user, admins] = await Promise.all([
    adminRepo.getUserById(userId),
    adminRepo.getSuperAdmins(),
  ]);

  if (!user || !admins.length) return;

  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ')
    || user.email.split('@')[0];
  const message = `Nouvel inscrit: ${displayName} — Motivation: ${motivationAnswer}`;
  const dateStr = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await Promise.allSettled([
    ...admins.map((admin) =>
      notificationsService.createNotification(admin.id, 'new_user', message)
    ),
    ...admins.map((admin) =>
      sendNewUserAdminNotification({
        displayName,
        email:      user.email,
        motivation: motivationAnswer,
        adminEmail: admin.email,
        date:       dateStr,
      }).catch(() => {})
    ),
  ]);
}

async function updateProfile(userId, data) {
  const profileData = {};
  if (data.level             !== undefined) profileData.level             = data.level;
  if (data.style             !== undefined) profileData.style             = data.style;
  if (data.strengths         !== undefined) profileData.strengths         = data.strengths;
  if (data.weaknesses        !== undefined) profileData.weaknesses        = data.weaknesses;
  if (data.description       !== undefined) profileData.description       = data.description;
  if (data.phone_number      !== undefined) profileData.phone_number      = data.phone_number      || null;
  if (data.bio               !== undefined) profileData.bio               = data.bio               || null;
  if (data.preferred_time    !== undefined) profileData.preferred_time    = data.preferred_time    || null;
  if (data.age_range         !== undefined) profileData.age_range         = data.age_range         || null;
  if (data.availability      !== undefined) profileData.availability      = data.availability      || null;
  if (data.motivation_answer !== undefined) profileData.motivation_answer = data.motivation_answer || null;

  return profileRepo.upsert(userId, profileData);
}

async function updatePhoto(userId, photoUrl) {
  return profileRepo.upsert(userId, { photo_url: photoUrl });
}

async function updateCoverPhoto(userId, coverUrl) {
  return profileRepo.upsert(userId, { cover_photo_url: coverUrl });
}

async function getProfile(userId) {
  return profileRepo.getByUserId(userId);
}

/**
 * Public profile: player_profile + basic user info (if no profile) + sessions_count + friends_count.
 * Used by GET /api/profile/user/:userId.
 */
async function getPublicProfile(userId) {
  const [profile, counts] = await Promise.all([
    profileRepo.getByUserId(userId),
    profileRepo.getCountsByUserId(userId),
  ]);

  if (!profile) {
    const userInfo = await profileRepo.getUserBasicInfo(userId);
    if (!userInfo) return null;
    return { ...userInfo, ...counts };
  }

  return { ...profile, ...counts };
}

/**
 * Sessions created by the given user — used for the sessions grid on their profile.
 */
async function getSessionsByUser(userId) {
  return sessionsRepo.listByCreator(userId);
}

/**
 * Players with a similar level to the given user. Falls back to empty array
 * if the user has no profile or no level set.
 */
async function getSimilarPlayers(userId) {
  const profile = await profileRepo.getByUserId(userId);
  if (!profile?.level) return [];
  return profileRepo.getSimilarPlayers(userId, profile.level);
}

module.exports = {
  generateProfile,
  updateProfile,
  updatePhoto,
  updateCoverPhoto,
  getProfile,
  getPublicProfile,
  getSessionsByUser,
  getSimilarPlayers,
};
