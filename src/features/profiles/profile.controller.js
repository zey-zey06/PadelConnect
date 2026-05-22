const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const Joi = require('joi');

const authenticate = require('../../middleware/authenticate');
const profileService = require('./profile.service');

const storage = multer.diskStorage({
  destination: 'uploads/profiles/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${req.user.sub}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Seules les images sont acceptées.'));
    } else {
      cb(null, true);
    }
  },
});

const generateSchema = Joi.object({
  description: Joi.string().min(10).max(2000).required(),
});

const updateProfileSchema = Joi.object({
  level: Joi.number().integer().min(1).max(7),
  style: Joi.string().max(100),
  strengths: Joi.array().items(Joi.string()),
  weaknesses: Joi.array().items(Joi.string()),
  description: Joi.string().max(1000),
  phone_number: Joi.string().max(20).optional().allow(null, ''),
}).min(1);

async function generateHandler(req, res, next) {
  try {
    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const profile = await profileService.generateProfile(req.user.sub, value.description);
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function updateHandler(req, res, next) {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const profile = await profileService.updateProfile(req.user.sub, value);
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function photoHandler(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: 'Fichier image requis.' });
    }
    const profile = await profileService.updatePhoto(req.user.sub, req.file.filename);
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function getMeHandler(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.user.sub);
    return res.json({ profile: profile || null });
  } catch (err) {
    next(err);
  }
}

async function getUserProfileHandler(req, res, next) {
  try {
    const profile = await profileService.getProfile(req.params.userId);
    if (!profile) return res.json({ profile: null });

    // phone_number is sensitive — only expose to venue_admin and super_admin
    const canSeePhone = ['venue_admin', 'super_admin'].includes(req.user.role);
    if (!canSeePhone) {
      const { phone_number, ...publicProfile } = profile;
      return res.json({ profile: publicProfile });
    }
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

const router = Router();
router.get('/me', authenticate, getMeHandler);
router.get('/user/:userId', authenticate, getUserProfileHandler);
router.post('/generate', authenticate, generateHandler);
router.put('/', authenticate, updateHandler);
router.post('/photo', authenticate, upload.single('photo'), photoHandler);

module.exports = router;
