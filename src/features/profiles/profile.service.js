const { generateProfile: generateFromAI }        = require('../../ai/generate-profile');
const profileRepo                                = require('./profile.repository');
const adminRepo                                  = require('../admin/admin.repository');
const notificationsService                       = require('../notifications/notifications.service');
const { sendNewUserAdminNotification }           = require('../../emails/confirmation');

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
  if (data.level        !== undefined) profileData.level        = data.level;
  if (data.style        !== undefined) profileData.style        = data.style;
  if (data.strengths    !== undefined) profileData.strengths    = data.strengths;
  if (data.weaknesses   !== undefined) profileData.weaknesses   = data.weaknesses;
  if (data.description  !== undefined) profileData.description  = data.description;
  if (data.phone_number !== undefined) profileData.phone_number = data.phone_number || null;

  return profileRepo.upsert(userId, profileData);
}

async function updatePhoto(userId, photoUrl) {
  return profileRepo.upsert(userId, { photo_url: photoUrl });
}

async function getProfile(userId) {
  return profileRepo.getByUserId(userId);
}

module.exports = { generateProfile, updateProfile, updatePhoto, getProfile };
