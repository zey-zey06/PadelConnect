const Joi = require('joi');

const signupSchema = Joi.object({
  first_name: Joi.string().max(50).optional().allow(null, ''),
  last_name:  Joi.string().max(50).optional().allow(null, ''),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid('player', 'coach', 'ball_picker', 'venue_admin')
    .default('player'),
  organization_id: Joi.string().uuid().optional().allow(null),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = { signupSchema, loginSchema };
