const express = require('express');
const router = express.Router();
const ProgresoController = require('../controllers/progresoController');
const { verifyToken, isAthlete } = require('../middlewares/authMiddleware');

// Todas las rutas requieren autenticación y que el usuario sea atleta
router.use(verifyToken);
router.use(isAthlete);

// Obtener ejercicios con progreso del atleta
router.get('/ejercicios', ProgresoController.getEjerciciosConProgreso);

// Actualizar o crear marca
router.post('/marca', ProgresoController.actualizarMarca);

// Obtener estadísticas del atleta
router.get('/estadisticas', ProgresoController.getEstadisticas);

// Eliminar marca (opcional)
router.delete('/marca/:id_ejercicio', ProgresoController.eliminarMarca);

module.exports = router;
