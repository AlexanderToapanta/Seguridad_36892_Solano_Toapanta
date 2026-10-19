const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const classesController = require('../controllers/classesController');
const { authMiddleware, isAdmin } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación y ser administrador
router.use(authMiddleware);
router.use(isAdmin);

// ===== CRUD MEMBRESÍAS =====
router.get('/memberships', adminController.getAllMemberships);
router.get('/memberships/:id', adminController.getMembershipById);
router.post('/memberships', adminController.createMembership);
router.put('/memberships/:id', adminController.updateMembership);
router.delete('/memberships/:id', adminController.deleteMembership);

// ===== CRUD ENTRENADORES =====
router.get('/trainers', adminController.getAllTrainers);
router.get('/trainers/:id', adminController.getTrainerById);
router.post('/trainers', adminController.createTrainer);
router.put('/trainers/:id', adminController.updateTrainer);
router.put('/trainers/:id/status', adminController.updateTrainerStatus);
router.delete('/trainers/:id', adminController.deleteTrainer);

// ===== CRUD CLASES =====
router.get('/classes', adminController.getAllClasses);
router.get('/classes/:id', adminController.getClassById);
router.post('/classes', adminController.createClass);
router.put('/classes/:id', adminController.updateClass);
router.put('/classes/:id/reactivate', adminController.reactivateClass);
router.delete('/classes/:id', adminController.deleteClass);
router.delete('/classes/:id/permanent', adminController.deleteClassPermanently);

// ===== GESTIÓN DE ATLETAS =====
router.get('/athletes', adminController.getAllAthletes);
router.get('/athletes/:id', adminController.getAthleteById);
router.post('/athletes', adminController.createAthlete);
router.put('/athletes/:id', adminController.updateAthlete);
router.put('/athletes/:id/membership', adminController.updateAthleteMembership);
router.put('/athletes/:id/status', adminController.updateAthleteStatus);
router.delete('/athletes/:id', adminController.deleteAthlete);

// ===== GESTIÓN DE MEMBRESÍAS DE ATLETAS =====
router.post('/memberships/assign', adminController.assignMembership);
router.get('/memberships/expired', adminController.getExpiredMemberships);
router.post('/memberships/deactivate-expired', adminController.deactivateExpiredMemberships);

// ===== ESTADÍSTICAS =====
router.get('/stats', adminController.getStats);

// ===== MANTENIMIENTO =====
router.post('/maintenance/delete-expired-classes', classesController.deleteExpiredClasses);

module.exports = router;
