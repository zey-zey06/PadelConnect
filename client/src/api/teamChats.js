import client from './client';

export const getMyChats        = ()                    => client.get('/team-chats/my');
export const getOrCreateChat   = (team_id, club_id)    => client.post('/team-chats', { team_id, club_id });
export const getChatMessages   = (chatId)              => client.get(`/team-chats/${chatId}/messages`);
export const sendChatMessage   = (chatId, content)     => client.post(`/team-chats/${chatId}/messages`, { content });
