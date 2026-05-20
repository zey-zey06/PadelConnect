/**
 * Base HTTP client — all fetch calls live here and in sibling api/* files.
 * Credentials (httpOnly cookies) are always included.
 */

const BASE_URL = '/api';

async function request(path, options = {}) {
  const { body, headers = {}, ...rest } = options;

  const init = {
    credentials: 'include',
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    ...rest,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, init);

  // Parse JSON body if present; fallback to empty object
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.message || 'Une erreur est survenue.');
    err.status  = response.status;
    err.data    = data;
    throw err;
  }

  return data;
}

export const get   = (path, opts)        => request(path, { method: 'GET',    ...opts });
export const post  = (path, body, opts)  => request(path, { method: 'POST',   body, ...opts });
export const put   = (path, body, opts)  => request(path, { method: 'PUT',    body, ...opts });
export const patch = (path, body, opts)  => request(path, { method: 'PATCH',  body, ...opts });
export const del   = (path, opts)        => request(path, { method: 'DELETE', ...opts });

export default { get, post, put, patch, delete: del };
