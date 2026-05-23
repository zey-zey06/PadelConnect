const { Router } = require('express');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const venuesService = require('./venues.service');

const addVenueSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional().allow(null, ''),
  amenities: Joi.object().optional().allow(null),
});

const addSlotSchema = Joi.object({
  date: Joi.string().required(),
  start_time: Joi.string().required(),
  end_time: Joi.string().required(),
  price: Joi.number().min(0).required(),
});

const updateSlotSchema = Joi.object({
  date: Joi.string().optional(),
  start_time: Joi.string().optional(),
  end_time: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
  status: Joi.string().valid('available', 'booked', 'cancelled').optional(),
}).min(1);

const bulkSlotPriceSchema = Joi.object({
  start_time: Joi.string().required(),
  end_time:   Joi.string().required(),
  price:      Joi.number().min(0).required(),
});

// ─── Club → Venues router (mounted at /api/clubs) ────────────────────────────
async function addVenueHandler(req, res, next) {
  try {
    const { error, value } = addVenueSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const venue = await venuesService.addVenue(req.params.id, req.user.sub, req.user.organization_id, value);
    return res.status(201).json({ venue });
  } catch (err) {
    next(err);
  }
}

async function listVenuesHandler(req, res, next) {
  try {
    const venues = await venuesService.listVenuesByClub(req.params.id);
    return res.json({ venues });
  } catch (err) {
    next(err);
  }
}

// ─── Venue → Slots router (mounted at /api/venues) ───────────────────────────
async function addSlotHandler(req, res, next) {
  try {
    const { error, value } = addSlotSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const slot = await venuesService.addSlot(req.params.id, req.user.organization_id, value);
    return res.status(201).json({ slot });
  } catch (err) {
    next(err);
  }
}

async function listSlotsHandler(req, res, next) {
  try {
    const slots = await venuesService.getAvailableSlots(req.params.id, req.query);
    return res.json({ slots });
  } catch (err) {
    next(err);
  }
}

async function updateSlotHandler(req, res, next) {
  try {
    const { error, value } = updateSlotSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const slot = await venuesService.updateSlot(
      req.params.id,
      req.params.slotId,
      req.user.organization_id,
      value,
    );
    return res.json({ slot });
  } catch (err) {
    next(err);
  }
}

async function bulkSlotPriceHandler(req, res, next) {
  try {
    const { error, value } = bulkSlotPriceSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const result = await venuesService.bulkUpdateSlotPrice(
      req.params.id,
      req.user.organization_id,
      value.start_time,
      value.end_time,
      value.price,
    );
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function fillVenueSlotsHandler(req, res, next) {
  try {
    const count = await venuesService.fillVenueSlots(req.params.id, req.user.organization_id);
    return res.json({ generated: count });
  } catch (err) {
    next(err);
  }
}

async function deleteSlotHandler(req, res, next) {
  try {
    const slot = await venuesService.deleteSlot(
      req.params.id,
      req.params.slotId,
      req.user.organization_id,
    );
    return res.json({ slot });
  } catch (err) {
    next(err);
  }
}

const clubVenuesRouter = Router();
clubVenuesRouter.post('/:id/venues', authenticate, requireRole('venue_admin'), addVenueHandler);
clubVenuesRouter.get('/:id/venues', authenticate, listVenuesHandler);

const venueSlotsRouter = Router();
venueSlotsRouter.post('/:id/slots/generate', authenticate, requireRole('venue_admin'), fillVenueSlotsHandler);
venueSlotsRouter.post('/:id/slots', authenticate, requireRole('venue_admin'), addSlotHandler);
venueSlotsRouter.get('/:id/slots', authenticate, listSlotsHandler);
venueSlotsRouter.patch('/:id/slots/bulk-price', authenticate, requireRole('venue_admin'), bulkSlotPriceHandler);
venueSlotsRouter.patch('/:id/slots/:slotId', authenticate, requireRole('venue_admin'), updateSlotHandler);
venueSlotsRouter.delete('/:id/slots/:slotId', authenticate, requireRole('venue_admin'), deleteSlotHandler);

module.exports = { clubVenuesRouter, venueSlotsRouter };
