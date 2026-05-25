import client from './client';

/** GET /api/friends → { friends: [...] } — my friends */
export const getFriends = () => client.get('/friends');

/** GET /api/friends/user/:userId → { friends: [...] } — another user's friends */
export const getUserFriends = (userId) => client.get(`/friends/user/${userId}`);

/** GET /api/friends/requests → { requests: [...] } */
export const getFriendRequests = () => client.get('/friends/requests');

/** GET /api/friends/status/:userId → { status: 'none'|'pending_sent'|'pending_received'|'accepted' } */
export const getFriendStatus = (userId) => client.get(`/friends/status/${userId}`);

/** POST /api/friends/request/:userId → { friendship, ok } */
export const sendFriendRequest = (userId) => client.post(`/friends/request/${userId}`);

/** POST /api/friends/accept/:userId → { friendship, ok } */
export const acceptFriendRequest = (userId) => client.post(`/friends/accept/${userId}`);

/** POST /api/friends/refuse/:userId → { friendship, ok } */
export const refuseFriendRequest = (userId) => client.post(`/friends/refuse/${userId}`);

/** DELETE /api/friends/:userId → { ok } */
export const unfriend = (userId) => client.delete(`/friends/${userId}`);
