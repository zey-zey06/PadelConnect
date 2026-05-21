const fs   = require('fs');
const path = require('path');

const { Router } = require('express');
const Joi        = require('joi');
const multer     = require('multer');

const authenticate  = require('../../middleware/authenticate');
const requireRole   = require('../../middleware/requireRole');
const { signToken } = require('../../auth/jwt');
const clubsService  = require('./clubs.service');

// Ensure upload directory exists
fs.mkdirSync('uploads/clubs', { recursive: true });

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
};

// ── Validation schemas ────────────────────────────────────────────────────────
const createClubSchema = Joi.object({
  name:        Joi.string().required(),
  slug:        Joi.string().required(),
  description: Joi.string().optional().allow(null, ''),
  address:     Joi.string().optional().allow(null, ''),
  phone:       Joi.string().optional().allow(null, ''),
});

const updateClubSchema = Joi.object({
  name:        Joi.string().optional(),
  description: Joi.string().optional().allow(null, ''),
  address:     Joi.string().optional().allow(null, ''),
  phone:       Joi.string().optional().allow(null, ''),
}).min(1);

// ── Logo upload (multer) ──────────────────────────────────────────────────────
const logoStorage = multer.diskStorage({
  destination: 'uploads/clubs/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.params.id}-${Date.now()}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Seules les images sont acceptées.'));
    } else {
      cb(null, true);
    }
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

    // Issue a new JWT with the fresh organization_id so subsequent API calls work
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

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();
router.post('/',            authenticate, requireRole('venue_admin'), createClubHandler);
router.get('/',             authenticate, listClubsHandler);
router.get('/:id',          authenticate, getClubHandler);
router.patch('/:id',        authenticate, requireRole('venue_admin'), updateClubHandler);
router.post('/:id/logo',    authenticate, requireRole('venue_admin'), uploadLogo.single('logo'), logoHandler);

module.exports = router;
