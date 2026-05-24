import client from './client';

/**
 * POST /api/pia/chat
 * { message, history, conversation_id? } → { response, conversation_id }
 */
export const piaChatMessage = (message, history = [], conversationId = null) =>
  client.post('/pia/chat', {
    message,
    history,
    ...(conversationId ? { conversation_id: conversationId } : {}),
  });

/**
 * GET /api/pia/history
 * → { messages: [{role, text, ts}], conversation_id }
 * Returns the last 20 messages from the user's most recent conversation.
 */
export const getPiaHistory = () => client.get('/pia/history');
