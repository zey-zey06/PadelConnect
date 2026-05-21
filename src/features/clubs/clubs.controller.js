const fs   = require('fs');
const path = require('path');

const { Router } = require('express');
const Joi        = require('joi');
const multer     = require('multer');

const authenticate  = require('../../middleware/authenticate');
const requireRole   = require('../../middleware/requireRole');
const { signToken } = require('../../auth/jwt');
const clubsService  = require('./clubs.service');

fs.mkdirSync('uploads/clubs', { recursive: true });

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

// ── Validation schemas ────────────────────────────────────────────────────────
const amenitiesSchema = Joi.object({
  vestiaires: Joi.boolean(), douches: Joi.boolean(), parking:     Joi.boolean(),
  pro_shop:   Joi.boolean(), restaurant: Joi.boolean(), wifi:     Joi.boolean(),
}).optional().allow(null);

const createClubSchema = Joi.object({
  name:        Joi.string().required(),
  slug:        Joi.string().required(),
  description: Joi.string().optional().allow(null, ''),
  address:     Joi.string().optional().allow(null, ''),
  phone:       Joi.string().optional().allow(null, ''),
  amenities:   amenitiesSchema,
});

const updateClubSchema = Joi.object({
  name:        Joi.string().optional(),
  description: Joi.string().optional().allow(null, ''),
  address:     Joi.string().optional().allow(null, ''),
  phone:       Joi.string().optional().allow(null, ''),
  amenities:   amenitiesSchema,
}).min(1);

// ── Multer — club images (logo + photos share the same directory) ──────────────
const clubImageStorage = multer.diskStorage({
  destination: 'uploads/clubs/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.params.id ?? 'new'}-${Date.now()}${ext}`);
  },
});

const uploadImage = multer({
  storage: clubImageStorage,
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
    const club = await clubsService.updateLogo(req.params.id, req.user.organization_id, req.file.filename);
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
    const club = await clubsService.addPhoto(req.params.id, req.user.organization_id, req.file.filename);
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

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();
router.post('/',              authenticate, requireRole('venue_admin'), createClubHandler);
router.get('/',               authenticate, listClubsHandler);
router.get('/:id/public',     authenticate, publicClubHandler);
router.get('/:id/slots',      authenticate, clubSlotsHandler);
router.get('/:id',            authenticate, getClubHandler);
router.patch('/:id',          authenticate, requireRole('venue_admin'), updateClubHandler);
router.post('/:id/logo',      authenticate, requireRole('venue_admin'), uploadImage.single('logo'),  logoHandler);
router.post('/:id/photos',    authenticate, requireRole('venue_admin'), uploadImage.single('photo'), addPhotoHandler);
router.delete('/:id/photos',  authenticate, requireRole('venue_admin'), removePhotoHandler);

module.exports = router;
