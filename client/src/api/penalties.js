import client from './client';

/** GET /api/penalties/me → { penalties: [...] } */
export const getMyPenalties = () => client.get('/penalties/me');

/** PATCH /api/penalties/:id/pay → { penalty } */
export const payPenalty = (id) => client.patch(`/penalties/${id}/pay`);
