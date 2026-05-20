import client from './client';

/** GET /api/profile/me → { profile } (null if not set up yet) */
export const getProfile = () => client.get('/profile/me');

/**
 * POST /api/profile/generate
 * { description: string } → { profile }  — AI upserts and returns the profile
 */
export const generateProfile = (description) =>
  client.post('/profile/generate', { description });

/**
 * PUT /api/profile
 * { level?, style?, strengths?, weaknesses?, description? } → { profile }
 */
export const updateProfile = (data) => client.put('/profile', data);

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
