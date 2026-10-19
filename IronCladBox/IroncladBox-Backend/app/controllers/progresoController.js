const ProgresoModel = require('../models/ProgresoModel');
const AtletaModel = require('../models/AtletaModel');
const EjercicioModel = require('../models/EjercicioModel');
const {
  validatePositiveDecimal,
  validatePositiveInt,
  sanitizeString
} = require('../utils/validators');

class ProgresoController {
    // Obtener todos los ejercicios con el progreso del atleta
    static async getEjerciciosConProgreso(req, res) {
        try {
            // Obtener id_atleta desde el usuario autenticado
            const atleta = await AtletaModel.findByUserId(req.user.id_usuario);
            
            if (!atleta) {
                return res.status(403).json({
                    success: false,
                    message: 'No se encontró perfil de atleta'
                });
            }

            const ejercicios = await ProgresoModel.getEjerciciosConProgreso(atleta.id_atleta);
            
            res.json({
                success: true,
                data: ejercicios
            });
        } catch (error) {
            console.error('Error al obtener ejercicios con progreso:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener los ejercicios',
                error: error.message
            });
        }
    }

    // Actualizar o crear marca
    static async actualizarMarca(req, res) {
        try {
            // Obtener id_atleta desde el usuario autenticado
            const atleta = await AtletaModel.findByUserId(req.user.id_usuario);
            
            if (!atleta) {
                return res.status(403).json({
                    success: false,
                    message: 'No se encontró perfil de atleta'
                });
            }

            const idAtleta = atleta.id_atleta;
            const { id_ejercicio, marca_maxima } = req.body;

            // Validaciones
            if (!id_ejercicio || !marca_maxima) {
                return res.status(400).json({
                    success: false,
                    message: 'Ejercicio y marca son obligatorios'
                });
            }

            const ejercicioErr = validatePositiveInt(id_ejercicio, 'ID Ejercicio');
            if (ejercicioErr) return res.status(400).json({ success: false, message: ejercicioErr });

            const marcaErr = validatePositiveDecimal(marca_maxima, 'Marca máxima', 2000);
            if (marcaErr) return res.status(400).json({ success: false, message: marcaErr });

            const ejercicio = await EjercicioModel.getById(id_ejercicio);
            if (!ejercicio) {
                return res.status(404).json({
                    success: false,
                    message: 'Ejercicio no encontrado'
                });
            }

            if (marca_maxima <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'La marca debe ser mayor a 0'
                });
            }

            const resultado = await ProgresoModel.upsertMarca(
                idAtleta, 
                id_ejercicio, 
                parseFloat(marca_maxima)
            );

            // Generar mensaje según el tipo de progreso
            let mensaje = '';
            let mensajeMotivacional = '';

            switch (resultado.progreso.tipo) {
                case 'nuevo':
                    mensaje = `¡Primera marca registrada: ${marca_maxima} lb!`;
                    mensajeMotivacional = '🎉 ¡Excelente! Has registrado tu primera marca. ¡Sigue así!';
                    break;
                case 'mejora':
                    mensaje = `¡Mejora de ${resultado.progreso.diferencia.toFixed(2)} lb!`;
                    mensajeMotivacional = `💪 ¡Increíble progreso! Pasaste de ${resultado.progreso.marca_anterior} lb a ${marca_maxima} lb. ¡Sigue mejorando!`;
                    break;
                case 'igual':
                    mensaje = 'Marca mantenida';
                    mensajeMotivacional = `✊ Mantuviste tu marca de ${marca_maxima} lb. La consistencia es clave, ¡sigue entrenando!`;
                    break;
                case 'descenso':
                    mensaje = `Marca anterior: ${resultado.progreso.marca_anterior} lb`;
                    mensajeMotivacional = `💙 No te desanimes. Todos tenemos días difíciles. Tu marca anterior fue ${resultado.progreso.marca_anterior} lb. ¡La próxima vez lo lograrás!`;
                    break;
            }

            res.json({
                success: true,
                message: mensaje,
                motivacion: mensajeMotivacional,
                data: resultado.registro,
                progreso: resultado.progreso
            });
        } catch (error) {
            console.error('Error al actualizar marca:', error);
            res.status(500).json({
                success: false,
                message: 'Error al actualizar la marca',
                error: error.message
            });
        }
    }

    // Obtener estadísticas del atleta
    static async getEstadisticas(req, res) {
        try {
            // Obtener id_atleta desde el usuario autenticado
            const atleta = await AtletaModel.findByUserId(req.user.id_usuario);

            if (!atleta) {
                return res.status(403).json({
                    success: false,
                    message: 'No se encontró perfil de atleta'
                });
            }

            const estadisticas = await ProgresoModel.getEstadisticas(atleta.id_atleta);

            res.json({
                success: true,
                data: estadisticas
            });
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas',
                error: error.message
            });
        }
    }

    // Eliminar marca (opcional)
    static async eliminarMarca(req, res) {
        try {
            // Obtener id_atleta desde el usuario autenticado
            const atleta = await AtletaModel.findByUserId(req.user.id_usuario);
            const { id_ejercicio } = req.params;

            if (!atleta) {
                return res.status(403).json({
                    success: false,
                    message: 'No autorizado'
                });
            }

            await ProgresoModel.deleteMarca(atleta.id_atleta, id_ejercicio);

            res.json({
                success: true,
                message: 'Marca eliminada correctamente'
            });
        } catch (error) {
            console.error('Error al eliminar marca:', error);
            res.status(500).json({
                success: false,
                message: 'Error al eliminar la marca',
                error: error.message
            });
        }
    }
}

module.exports = ProgresoController;
