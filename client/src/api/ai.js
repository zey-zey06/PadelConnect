import { post } from './client';

export const findMatches = (sessionId) => post('/ai/find-matches', { sessionId });

