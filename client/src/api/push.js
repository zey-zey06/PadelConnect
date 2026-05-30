import client from './client';

export const getVapidKey   = ()   => client.get('/push/vapid-key');
export const subscribePush = (sub) => client.post('/push/subscribe', sub);
