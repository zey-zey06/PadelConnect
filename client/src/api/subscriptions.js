import client from './client';

export const getMySubscription      = ()               => client.get('/subscriptions/my');
export const getSubscriptionHistory = ()               => client.get('/subscriptions/history');
export const paySubscription        = (payment_method) => client.post('/subscriptions/pay', { payment_method });

export const getAdminSubscriptions  = ()      => client.get('/admin/subscriptions');
export const activateSubscription   = (orgId) => client.patch(`/admin/subscriptions/${orgId}/activate`);
export const suspendSubscription    = (orgId) => client.patch(`/admin/subscriptions/${orgId}/suspend`);
export const markSubscriptionPaid   = (orgId) => client.patch(`/admin/subscriptions/${orgId}/mark-paid`);

export const getAdminRevenue = (period = 'month') =>
  client.get(`/admin/subscriptions/revenue?period=${period}`);
