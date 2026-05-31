const { Router } = require('express');
const Joi        = require('joi');
const multer     = require('multer');

const authenticate  = require('../../middleware/authenticate');
const requireRole   = require('../../middleware/requireRole');
const { signToken } = require('../../auth/jwt');
const clubsService  = require('./clubs.service');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

// ── UUID param guard ──────────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(req, res, next) {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ status: 400, error: 'Bad Request', message: 'Identifiant de club invalide.' });
  }
  next();
}

// ── Validation schemas ────────────────────────────────────────────────────────
const amenitiesSchema = Joi.object({
  vestiaires:     Joi.boolean(), douches:    Joi.boolean(), parking:         Joi.boolean(),
  pro_shop:       Joi.boolean(), restaurant: Joi.boolean(), wifi:            Joi.boolean(),
  boutique:       Joi.boolean(), eclairage_nuit: Joi.boolean(),
}).optional().allow(null);

const createClubSchema = Joi.object({
  name:        Joi.string().required(),
  slug:        Joi.string().required(),
  description: Joi.string().optional().allow(null, ''),
  address:     Joi.string().optional().allow(null, ''),
  phone:       Joi.string().optional().allow(null, ''),
  amenities:   amenitiesSchema,
});

const dayHoursSchema = Joi.object({
  open:   Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  close:  Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
  closed: Joi.boolean().optional(),
});

const updateClubSchema = Joi.object({
  name:          Joi.string().optional(),
  description:   Joi.string().optional().allow(null, ''),
  address:       Joi.string().optional().allow(null, ''),
  phone:         Joi.string().optional().allow(null, ''),
  email:         Joi.string().email({ tlds: { allow: false } }).optional().allow(null, ''),
  amenities:     amenitiesSchema,
  opening_hours: Joi.object({
    monday: dayHoursSchema, tuesday: dayHoursSchema, wednesday: dayHoursSchema,
    thursday: dayHoursSchema, friday: dayHoursSchema, saturday: dayHoursSchema,
    sunday: dayHoursSchema,
  }).optional().allow(null),
}).min(1);

// Memory storage — images are kept as base64 data-URLs in the DB so they
// survive Render container restarts (ephemeral filesystem).
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) cb(new Error('Seules les images sont acceptées.'));
    else cb(null, true);
  },
});

// ── Handlers ──────────────────────────────────────────────────────────────────
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
    const newToken = signToken({ sub: req.user.sub, role: req.user.role, organization_id: club.id });
    res.cookie('token', newToken, COOKIE_OPTIONS);
    return res.status(201).json({ club });
  } catch (err) {
    next(err);
  }
}

async function updateClubHandler(req, res, next) {
  try {
    const { error, value } = updateClubSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    // Serialize JSONB fields — knex needs a stringified value for jsonb columns
    if (value.opening_hours !== undefined) {
      value.opening_hours = value.opening_hours === null
        ? null
        : JSON.stringify(value.opening_hours);
    }
    const club = await clubsService.updateClub(req.params.id, req.user.organization_id, value);
    return res.json({ club });
  } catch (err) {
    next(err);
  }
}

async function logoHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Fichier image requis.' });
    }
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const club = await clubsService.updateLogo(req.params.id, req.user.organization_id, dataUrl);
    return res.json({ club });
  } catch (err) {
    next(err);
  }
}

async function addPhotoHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Fichier image requis.' });
    }
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const club = await clubsService.addPhoto(req.params.id, req.user.organization_id, dataUrl);
    return res.json({ club });
  } catch (err) {
    next(err);
  }
}

async function removePhotoHandler(req, res, next) {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'URL requise.' });
    }
    const club = await clubsService.removePhoto(req.params.id, req.user.organization_id, url);
    return res.json({ club });
  } catch (err) {
    next(err);
  }
}

async function coverHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Fichier image requis.' });
    }
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const club = await clubsService.updateCover(req.params.id, req.user.organization_id, dataUrl);
    return res.json({ club });
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

async function publicClubHandler(req, res, next) {
  try {
    const { club, venues } = await clubsService.getPublicClub(req.params.id);
    return res.json({ club, venues });
  } catch (err) {
    next(err);
  }
}

async function clubSlotsHandler(req, res, next) {
  try {
    const date   = req.query.date || new Date().toISOString().slice(0, 10);
    const result = await clubsService.getClubSlots(req.params.id, date);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function ballPickersHandler(req, res, next) {
  try {
    const ballPickers = await clubsService.getBallPickers(req.params.id);
    return res.json({ ballPickers });
  } catch (err) {
    next(err);
  }
}

const addBallPickerSchema = Joi.object({
  first_name: Joi.string().required(),
  last_name:  Joi.string().optional().allow(null, ''),
  phone:      Joi.string().optional().allow(null, ''),
});

async function addBallPickerHandler(req, res, next) {
  try {
    const { error, value } = addBallPickerSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const ballPicker = await clubsService.createBallPicker(req.params.id, req.user.organization_id, value);
    return res.status(201).json({ ballPicker });
  } catch (err) {
    next(err);
  }
}

async function removeBallPickerHandler(req, res, next) {
  try {
    await clubsService.removeBallPicker(req.params.id, req.user.organization_id, req.params.userId);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ── Favorites ──────────────────────────────────────────────────────────────────
async function toggleFavoriteHandler(req, res, next) {
  try {
    const result = await clubsService.toggleFavorite(req.params.id, req.user.sub);
    return res.json(result);
  } catch (err) { next(err); }
}

async function favoriteStatusHandler(req, res, next) {
  try {
    const result = await clubsService.getClubFavoriteStatus(req.params.id, req.user.sub);
    return res.json(result);
  } catch (err) { next(err); }
}

async function myFavoritesHandler(req, res, next) {
  try {
    const clubs = await clubsService.getFavoriteClubs(req.user.sub);
    return res.json({ clubs });
  } catch (err) { next(err); }
}

// ── Subscriptions ─────────────────────────────────────────────────────────────
async function toggleSubscriptionHandler(req, res, next) {
  try {
    const result = await clubsService.toggleSubscription(req.params.id, req.user.sub);
    return res.json(result);
  } catch (err) { next(err); }
}

async function subscriptionStatusHandler(req, res, next) {
  try {
    const result = await clubsService.getClubSubscriptionStatus(req.params.id, req.user.sub);
    return res.json(result);
  } catch (err) { next(err); }
}

// ── Posts ─────────────────────────────────────────────────────────────────────
const createPostSchema = Joi.object({
  content: Joi.string().min(1).max(2000).required(),
  photos:  Joi.array().items(Joi.string()).max(9).optional().default([]),
});

async function createPostHandler(req, res, next) {
  try {
    const { error, value } = createPostSchema.validate(req.body);
    if (error) return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    const post = await clubsService.createClubPost(req.params.id, req.user.organization_id, value);
    return res.status(201).json({ post });
  } catch (err) { next(err); }
}

async function getPostsHandler(req, res, next) {
  try {
    const posts = await clubsService.getClubPosts(req.params.id);
    return res.json({ posts });
  } catch (err) { next(err); }
}

async function deletePostHandler(req, res, next) {
  try {
    await clubsService.deleteClubPost(req.params.id, req.params.postId, req.user.organization_id);
    return res.json({ ok: true });
  } catch (err) { next(err); }
}

async function subscribersHandler(req, res, next) {
  try {
    const subscribers = await clubsService.getSubscribers(req.params.id);
    return res.json({ subscribers });
  } catch (err) { next(err); }
}

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();
router.get('/featured',       listClubsHandler); // public — no auth required
router.post('/',              authenticate, requireRole('venue_admin'), createClubHandler);
router.get('/',               authenticate, listClubsHandler);
router.get('/:id/public',     authenticate, validateId, publicClubHandler);
router.get('/:id/slots',         authenticate, validateId, clubSlotsHandler);
router.get('/:id/ball-pickers',             authenticate, validateId, ballPickersHandler);
router.post('/:id/ball-pickers',            authenticate, validateId, requireRole('venue_admin'), addBallPickerHandler);
router.delete('/:id/ball-pickers/:userId',  authenticate, validateId, requireRole('venue_admin'), removeBallPickerHandler);
router.get('/:id',               authenticate, validateId, getClubHandler);
router.patch('/:id',          authenticate, validateId, requireRole('venue_admin'), updateClubHandler);
router.post('/:id/logo',      authenticate, validateId, requireRole('venue_admin'), uploadImage.single('logo'),  logoHandler);
router.post('/:id/cover',     authenticate, validateId, requireRole('venue_admin'), uploadImage.single('cover'), coverHandler);
router.post('/:id/photos',    authenticate, validateId, requireRole('venue_admin'), uploadImage.single('photo'), addPhotoHandler);
router.delete('/:id/photos',  authenticate, validateId, requireRole('venue_admin'), removePhotoHandler);

// Favorites
router.get('/my/favorites',        authenticate, myFavoritesHandler);
router.get('/:id/favorite',        authenticate, validateId, favoriteStatusHandler);
router.post('/:id/favorite',       authenticate, validateId, toggleFavoriteHandler);

// Subscriptions
router.get('/:id/subscription',    authenticate, validateId, subscriptionStatusHandler);
router.post('/:id/subscription',   authenticate, validateId, toggleSubscriptionHandler);
router.get('/:id/subscribers',     authenticate, validateId, subscribersHandler);

// Posts
router.get('/:id/posts',           authenticate, validateId, getPostsHandler);
router.post('/:id/posts',          authenticate, validateId, requireRole('venue_admin'), createPostHandler);
router.delete('/:id/posts/:postId', authenticate, validateId, requireRole('venue_admin'), deletePostHandler);

module.exports = router;
