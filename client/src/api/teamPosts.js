import client from './client';

export const getFeedPosts    = ()                         => client.get('/team-posts/feed');
export const getTeamPosts    = (teamId)                   => client.get(`/team-posts/team/${teamId}`);
export const createPost      = (teamId, data)             => client.post(`/team-posts/${teamId}`, data);
export const toggleLike      = (postId)                   => client.post(`/team-posts/${postId}/like`);
export const getComments     = (postId)                   => client.get(`/team-posts/${postId}/comments`);
export const addComment      = (postId, body)             => client.post(`/team-posts/${postId}/comments`, { body });
