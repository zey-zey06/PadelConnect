const { Router } = require('express');
const multer = require('multer');
const Joi = require('joi');

const authenticate  = require('../../middleware/authenticate');
const validate      = require('../../middleware/validate');
const profileService = require('./profile.service');
const { updateUsername } = require('../../auth/auth.service');

// Use memory storage so photos are converted to base64 data-URLs and stored
// in the DB — no disk writes, survives Render redeploys.
const upload = multer({
  storage: multer.memoryStorage(),
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
  description:       Joi.string().min(10).max(2000).optional(),
  qa_answers:        Joi.array().items(
    Joi.object({
      question: Joi.string().required(),
      answer:   Joi.string().required(),
    })
  ).min(1).optional(),
  motivation_answer: Joi.string().max(500).optional().allow(null, ''),
}).or('description', 'qa_answers');

const updateProfileSchema = Joi.object({
  level:             Joi.number().integer().min(1).max(7),
  style:             Joi.string().max(100),
  strengths:         Joi.array().items(Joi.string()),
  weaknesses:        Joi.array().items(Joi.string()),
  description:       Joi.string().max(1000),
  phone_number:      Joi.string().max(20).optional().allow(null, ''),
  bio:               Joi.string().max(150).optional().allow(null, ''),
  preferred_time:    Joi.string().max(100).optional().allow(null, ''),
  age_range:         Joi.string().max(50).optional().allow(null, ''),
  availability:      Joi.string().max(100).optional().allow(null, ''),
  motivation_answer: Joi.string().max(500).optional().allow(null, ''),
}).min(1);

const usernameSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .pattern(/^[a-z0-9_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Le nom d\'utilisateur ne peut contenir que des lettres minuscules, chiffres et underscores.',
    }),
});

async function generateHandler(req, res, next) {
  try {
    const { error, value } = generateSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    const profile = await profileService.generateProfile(
      req.user.sub,
      value.description       ?? null,
      value.qa_answers        ?? null,
      value.motivation_answer ?? null,
    );
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
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const profile = await profileService.updatePhoto(req.user.sub, dataUrl);
    return res.json({ profile });
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
    const profile = await profileService.updateCoverPhoto(req.user.sub, dataUrl);
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
}

async function usernameHandler(req, res, next) {
  try {
    const { error, value } = usernameSchema.validate(req.body);
    if (error) {
      return res.status(422).json({ status: 422, error: 'Validation Error', message: error.details[0].message });
    }
    await updateUsername(req.user.sub, value.username);
    return res.json({ ok: true, username: value.username });
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
    const profile = await profileService.getPublicProfile(req.params.userId);
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

async function getUserSessionsHandler(req, res, next) {
  try {
    const sessions = await profileService.getSessionsByUser(req.params.userId);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

async function getSimilarPlayersHandler(req, res, next) {
  try {
    const players = await profileService.getSimilarPlayers(req.params.userId);
    return res.json({ players });
  } catch (err) {
    next(err);
  }
}

const router = Router();
router.get('/me', authenticate, getMeHandler);
router.get('/user/:userId', authenticate, getUserProfileHandler);
router.get('/user/:userId/sessions', authenticate, getUserSessionsHandler);
router.get('/user/:userId/similar', authenticate, getSimilarPlayersHandler);
router.post('/generate', authenticate, generateHandler);
router.put('/', authenticate, updateHandler);
router.post('/photo', authenticate, upload.single('photo'), photoHandler);
router.post('/cover', authenticate, upload.single('cover'), coverHandler);
router.patch('/username', authenticate, usernameHandler);

module.exports = router;
