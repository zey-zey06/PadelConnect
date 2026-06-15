import client from './client';

export const getFeed = ({ page = 1, limit = 20 } = {}) =>
  client.get(`/feed?page=${page}&limit=${limit}`);
