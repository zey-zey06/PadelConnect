const { Router } = require('express');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const requireRole = require('../../middleware/requireRole');
const clubsService = require('./clubs.service');

const createClubSchema = Joi.object({
  name: Joi.string().required(),
  slug: Joi.string().required(),
});

async function createClubHandler(req, res, next) {
  try {
    if (req.user.organization_id) {
      return res.status(409).json({ status: 409, error: 'Conflict', message: 'Vous gérez déjà un club.' });
    }
    const { error, value } = createClubSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const club = await clubsService.createClub(req.user.sub, value);
    return res.status(201).json({ club });
  } catch (err) {
    next(err);
  }
}

async function listClubsHandler(req, res, next) {
  try {
    const clubs = await clubsService.listClubs();
    return res.json({ clubs });
  } catch (err) {
    next(err);
  }
}

async function getClubHandler(req, res, next) {
  try {
    const club = await clubsService.getClub(req.params.id);
    return res.json({ club });
  } catch (err) {
    next(err);
  }
}

const router = Router();
router.post('/', authenticate, requireRole('venue_admin'), createClubHandler);
router.get('/', authenticate, listClubsHandler);
router.get('/:id', authenticate, getClubHandler);

module.exports = router;
