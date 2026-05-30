const { Router } = require('express');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const bookingsService = require('./bookings.service');

const createBookingSchema = Joi.object({
  session_id:     Joi.string().uuid().required(),
  venue_slot_id:  Joi.string().uuid().required(),
  payment_method: Joi.string().valid('card', 'on_arrival', 'wave', 'orange_money', 'balance').optional().default('on_arrival'),
  payment_phone:  Joi.string().optional().allow('', null),
  total_price:    Joi.number().min(0).optional(), // slot price + addons, sent by client for reference
  addons: Joi.array().items(
    Joi.object({
      type:    Joi.string().valid('coach', 'ball_picker').required(),
      user_id: Joi.string().uuid().required(),
      price:   Joi.number().min(0).required(),
    })
  ).optional().default([]),
});

async function createBookingHandler(req, res, next) {
  try {
    const { error, value } = createBookingSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const booking = await bookingsService.createBooking(req.user.sub, value);
    return res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
}

async function getMyBookingsHandler(req, res, next) {
  try {
    const bookings = await bookingsService.getMyBookings(req.user.sub);
    return res.json({ bookings });
  } catch (err) {
    next(err);
  }
}

async function cancelBookingHandler(req, res, next) {
  try {
    const booking = await bookingsService.cancelBooking(req.params.id, req.user.sub);
    return res.json({ booking });
  } catch (err) {
    next(err);
  }
}

const router = Router();
router.post('/', authenticate, createBookingHandler);
router.get('/me', authenticate, getMyBookingsHandler);
router.delete('/:id', authenticate, cancelBookingHandler);

module.exports = router;
