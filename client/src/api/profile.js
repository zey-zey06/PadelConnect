import client from './client';

/** GET /api/profile/me → { profile } (null if not set up yet) */
export const getProfile = () => client.get('/profile/me');

/** GET /api/profile/user/:userId → { profile } — public profile of any user (includes sessions_count, friends_count) */
export const getUserProfile = (userId) => client.get(`/profile/user/${userId}`);

/** GET /api/profile/user/:userId/sessions → { sessions } — sessions created by this user */
export const getUserSessions = (userId) => client.get(`/profile/user/${userId}/sessions`);

/** GET /api/profile/user/:userId/similar → { players } — players with similar level */
export const getSimilarPlayers = (userId) => client.get(`/profile/user/${userId}/similar`);

/** PATCH /api/profile/username — update own username */
export const updateUsername = (username) => client.patch('/profile/username', { username });

/**
 * POST /api/profile/generate
 * { description: string } → { profile }  — AI upserts and returns the profile
 */
export const generateProfile = (description) =>
  client.post('/profile/generate', { description });

/**
 * POST /api/profile/generate
 * { qa_answers: [{question, answer}], motivation_answer? } → { profile }
 * Used by the PIA interview flow in ProfileSetup.
 */
export const generateProfileFromQA = (qaAnswers, motivationAnswer = null) =>
  client.post('/profile/generate', {
    qa_answers: qaAnswers,
    ...(motivationAnswer ? { motivation_answer: motivationAnswer } : {}),
  });

/**
 * PUT /api/profile
 * { level?, style?, strengths?, weaknesses?, description? } → { profile }
 */
export const updateProfile = (data) => client.put('/profile', data);

/**
 * POST /api/profile/cover  (multipart/form-data)
 * file field: cover → { profile }
 */
export const uploadCoverPhoto = (file) => {
  const form = new FormData();
  form.append('cover', file);
  return fetch('/api/profile/cover', {
    method: 'POST',
    credentials: 'include',
    body: form,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Erreur lors de l\'upload.');
      err.status = res.status;
      throw err;
    }
    return data;
  });
};

/**
 * POST /api/profile/photo  (multipart/form-data)
 * file field: photo → { profile }
 */
export const uploadPhoto = (file) => {
  const form = new FormData();
  form.append('photo', file);
  return fetch('/api/profile/photo', {
    method: 'POST',
    credentials: 'include',
    body: form,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Erreur lors de l\'upload.');
      err.status = res.status;
      throw err;
    }
    return data;
  });
};
