const express = require('express');
const router = express.Router();
const trainersController = require('../controllers/trainersController');
const { authMiddleware, isTrainer } = require('../middlewares/authMiddleware');

// Rutas protegidas para entrenadores
router.get('/my-classes', authMiddleware, isTrainer, trainersController.getMyClasses);
router.get('/my-wods', authMiddleware, isTrainer, trainersController.getMyWODs);
router.get('/my-athletes', authMiddleware, isTrainer, trainersController.getMyAthletes);

// Rutas públicas para entrenadores
router.get('/', trainersController.getAllTrainers);
router.get('/:id', trainersController.getTrainerById);
router.get('/specialty/:specialty', trainersController.getTrainersBySpecialty);

module.exports = router;
