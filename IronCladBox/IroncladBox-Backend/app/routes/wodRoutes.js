const express = require('express');
const router = express.Router();
const wodController = require('../controllers/wodController');
const { authMiddleware, isTrainer, isAthlete } = require('../middlewares/authMiddleware');

// ==================== RUTAS PÚBLICAS ====================
// Obtener WODs de un mes (para calendario)
router.get('/calendar/:year/:month', wodController.getWODsByMonth);

// Obtener WOD por fecha
router.get('/date/:fecha', authMiddleware, wodController.getWODByDate);

// ==================== RUTAS DE ATLETAS ====================
// Obtener mis horarios inscritos - DEBE IR ANTES DE /:id_wod
router.get('/my-schedules', authMiddleware, isAthlete, wodController.getMySchedules);

// ==================== RUTAS DE ASISTENCIAS Y RACHAS (ANTES DE /:id_wod) ====================
// Obtener racha del atleta
router.get('/racha', authMiddleware, isAthlete, wodController.getRachaAtleta);

// Obtener historial de asistencias
router.get('/historial-asistencias', authMiddleware, isAthlete, wodController.getHistorialAsistencias);

// Marcar asistencia (atleta)
router.post('/asistencia/:id_inscripcion', authMiddleware, isAthlete, wodController.marcarAsistencia);

// ==================== RUTAS DE HORARIOS ====================
// Inscribirse a un horario
router.post('/schedule/:id_horario/enroll', authMiddleware, isAthlete, wodController.enrollSchedule);

// Cancelar inscripción a un horario
router.delete('/schedule/:id_horario/unenroll', authMiddleware, isAthlete, wodController.unenrollSchedule);

// Cancelar horario (trainer)
router.put('/schedule/:id_horario/cancel', authMiddleware, isTrainer, wodController.cancelSchedule);

// Obtener inscritos en un horario
router.get('/schedule/:id_horario/athletes', authMiddleware, isTrainer, wodController.getEnrolledAthletes);

// ==================== RUTAS DE WOD (CON :id_wod AL FINAL) ====================
// Obtener horarios de un WOD
router.get('/:id_wod/schedules', authMiddleware, isTrainer, wodController.getSchedulesByWOD);

// Crear horario para un WOD
router.post('/:id_wod/schedule', authMiddleware, isTrainer, wodController.createSchedule);

// Obtener un WOD por ID - DEBE IR DESPUÉS DE TODAS LAS RUTAS ESPECÍFICAS
router.get('/:id_wod', authMiddleware, wodController.getWODById);

// ==================== RUTAS DE ENTRENADORES ====================
// Crear WOD
router.post('/', authMiddleware, isTrainer, wodController.createWOD);

// Actualizar WOD
router.put('/:id_wod', authMiddleware, isTrainer, wodController.updateWOD);

// Eliminar WOD
router.delete('/:id_wod', authMiddleware, isTrainer, wodController.deleteWOD);

module.exports = router;
