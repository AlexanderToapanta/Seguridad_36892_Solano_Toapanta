const express = require('express');
const router = express.Router();
const classesController = require('../controllers/classesController');
const { authMiddleware, isTrainer, isAthlete } = require('../middlewares/authMiddleware');

// Rutas públicas
router.get('/', classesController.getAllClasses);
router.get('/available', classesController.getAvailableClasses);

// Rutas protegidas - Atletas (antes de /:id para evitar conflictos)
router.get('/my-classes', authMiddleware, isAthlete, classesController.getMyClasses);
router.post('/enroll', authMiddleware, isAthlete, classesController.enrollClass);
router.delete('/unenroll/:id', authMiddleware, isAthlete, classesController.cancelEnrollment);
router.delete('/delete-enrollment/:id', authMiddleware, isAthlete, classesController.deleteEnrollment);

// Ruta dinámica con ID
router.get('/:id', classesController.getClassById);

// Rutas protegidas - Entrenadores y Admins
router.post('/', authMiddleware, isTrainer, classesController.createClass);
router.put('/:id', authMiddleware, isTrainer, classesController.updateClass);
router.delete('/:id', authMiddleware, isTrainer, classesController.deleteClass);
router.get('/:id/students', authMiddleware, isTrainer, classesController.getEnrolledStudents);

module.exports = router;
