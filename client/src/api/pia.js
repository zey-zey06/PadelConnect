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
 * GET /api/pia/history[?conversation_id=xxx]
 * → { messages: [{role, text, ts}], conversation_id }
 * Returns the last 20 messages from the specified conversation (or the most recent one).
 */
export const getPiaHistory = (params = {}) => {
  const qs = params.conversationId ? `?conversation_id=${params.conversationId}` : '';
  return client.get(`/pia/history${qs}`);
};

/**
 * GET /api/pia/conversations
 * → { conversations: [{id, title, updated_at, message_count}] }
 * Returns the user's conversation list (up to 50), most recent first.
 */
export const getPiaConversations = () => client.get('/pia/conversations');
