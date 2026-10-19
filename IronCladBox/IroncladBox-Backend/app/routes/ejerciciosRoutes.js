const express = require('express');
const router = express.Router();
const { EjerciciosController, uploadEjercicioImage } = require('../controllers/ejerciciosController');
const { authMiddleware, isTrainer, isAdmin } = require('../middlewares/authMiddleware');

// Rutas públicas (accesibles para atletas y entrenadores autenticados)
router.get('/', authMiddleware, EjerciciosController.getAll);
router.get('/search', authMiddleware, EjerciciosController.search);
router.get('/stats', authMiddleware, EjerciciosController.getStats);
router.get('/:id', authMiddleware, EjerciciosController.getById);

// Rutas protegidas (solo entrenadores y administradores)
router.post('/', authMiddleware, isTrainer, uploadEjercicioImage, EjerciciosController.create);
router.put('/:id', authMiddleware, isTrainer, uploadEjercicioImage, EjerciciosController.update);
router.delete('/:id', authMiddleware, isTrainer, EjerciciosController.delete);
router.patch('/:id/reactivate', authMiddleware, isTrainer, EjerciciosController.reactivate);

module.exports = router;
