const { generateProfile: generateFromAI } = require('../../ai/generate-profile');
const profileRepo = require('./profile.repository');

async function generateProfile(userId, description) {
  const aiResult = await generateFromAI(description);

  return profileRepo.upsert(userId, {
    level: aiResult.niveau,
    style: aiResult.style,
    strengths: aiResult.points_forts,
    weaknesses: aiResult.points_faibles,
    description: aiResult.description_courte,
  });
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
  // photoUrl is a base64 data-URL (e.g. "data:image/jpeg;base64,...") —
  // stored directly in the DB so photos survive container restarts.
  return profileRepo.upsert(userId, { photo_url: photoUrl });
}

async function getProfile(userId) {
  return profileRepo.getByUserId(userId);
}

module.exports = { generateProfile, updateProfile, updatePhoto, getProfile };
