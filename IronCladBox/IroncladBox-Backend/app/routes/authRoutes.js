const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const upload = require('../../config/multer');

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/memberships', authController.getAvailableMemberships);

// Rutas protegidas
router.post('/logout', authMiddleware, authController.logout);
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/verify', authMiddleware, authController.verifyToken);
router.post('/upload-profile-image', authMiddleware, upload.single('profileImage'), authController.uploadProfileImage);

module.exports = router;
