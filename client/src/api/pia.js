import client from './client';

/**
 * POST /api/pia/chat
 * { message: string, history: Array<{ role: 'user'|'model', parts: [{ text: string }] }> }
 * → { response: string }
 */
export const piaChatMessage = (message, history = []) =>
  client.post('/pia/chat', { message, history });
