const { WODModel, HorarioClaseModel } = require('../models/WODModel');
const InscripcionModel = require('../models/InscripcionModel');
const RachaModel = require('../models/RachaModel');
const {
  validateNotEmpty,
  validatePositiveInt,
  validateDate,
  validateHorariosArray,
  sanitizeString
} = require('../utils/validators');

// Controlador para WODs y calendario
const wodController = {
  // ==================== WOD CRUD ====================
  
  // Crear WOD
  createWOD: async (req, res) => {
    try {
      const { query } = require('../../config/database');
      const { fecha, titulo, descripcion, tipo, nivel, horarios } = req.body;

      const fechaErr = validateDate(fecha, 'Fecha', { notPast: true });
      if (fechaErr) return res.status(400).json({ success: false, message: fechaErr });

      const tituloErr = validateNotEmpty(titulo, 'Título');
      if (tituloErr) return res.status(400).json({ success: false, message: tituloErr });

      const descErr = validateNotEmpty(descripcion, 'Descripción');
      if (descErr) return res.status(400).json({ success: false, message: descErr });

      const horariosErr = validateHorariosArray(horarios);
      if (horariosErr) return res.status(400).json({ success: false, message: horariosErr });

      // Verificar si ya existe WOD para esa fecha
      const exists = await WODModel.existsForDate(fecha);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un WOD programado para esta fecha'
        });
      }

      // Crear WOD sin id_entrenador (se asigna por horario)
      const wod = await WODModel.create({
        fecha,
        titulo,
        descripcion,
        tipo,
        nivel,
        id_entrenador: null
      });

      // Crear horarios con sus respectivos entrenadores
      if (horarios && horarios.length > 0) {
        await HorarioClaseModel.createMultiple(wod.id_wod, horarios);
      }

      // Obtener WOD completo con horarios
      const wodComplete = await WODModel.findByDateWithSchedules(fecha);

      res.status(201).json({
        success: true,
        message: 'WOD creado exitosamente',
        data: wodComplete
      });
    } catch (error) {
      console.error('Error al crear WOD:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el WOD',
        error: error.message
      });
    }
  },

  // Obtener WOD por fecha
  getWODByDate: async (req, res) => {
    try {
      const { fecha } = req.params;
      const wod = await WODModel.findByDateWithSchedules(fecha);

      if (!wod) {
        return res.status(404).json({
          success: false,
          message: 'No hay WOD programado para esta fecha'
        });
      }

      // Si es atleta, verificar si ya está inscrito
      if (req.user.rol === 'ATLETA') {
        const { query: queryDb } = require('../../config/database');
        const atletaResult = await queryDb(
          'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
          [req.user.id_usuario]
        );

        if (atletaResult.rows.length > 0) {
          const id_atleta = atletaResult.rows[0].id_atleta;
          const enrollment = await HorarioClaseModel.checkAthleteEnrolledToday(
            id_atleta,
            fecha
          );
          wod.athlete_enrolled = enrollment || null;
        }
      }

      res.json({
        success: true,
        data: wod
      });
    } catch (error) {
      console.error('Error al obtener WOD:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el WOD',
        error: error.message
      });
    }
  },

  // Obtener WOD por ID
  getWODById: async (req, res) => {
    try {
      const { id_wod } = req.params;
      const wod = await WODModel.findById(id_wod);

      if (!wod) {
        return res.status(404).json({
          success: false,
          message: 'WOD no encontrado'
        });
      }

      res.json({
        success: true,
        data: wod
      });
    } catch (error) {
      console.error('Error al obtener WOD:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el WOD',
        error: error.message
      });
    }
  },

  // Obtener WODs de un mes (para calendario)
  getWODsByMonth: async (req, res) => {
    try {
      const { year, month } = req.params;
      const wods = await WODModel.findByMonth(parseInt(year), parseInt(month));

      res.json({
        success: true,
        data: wods
      });
    } catch (error) {
      console.error('Error al obtener WODs del mes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los WODs del mes',
        error: error.message
      });
    }
  },

  // Actualizar WOD
  updateWOD: async (req, res) => {
    try {
      const { id_wod } = req.params;
      const wodData = req.body;

      const updatedWOD = await WODModel.update(id_wod, wodData);

      if (!updatedWOD) {
        return res.status(404).json({
          success: false,
          message: 'WOD no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'WOD actualizado exitosamente',
        data: updatedWOD
      });
    } catch (error) {
      console.error('Error al actualizar WOD:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el WOD',
        error: error.message
      });
    }
  },

  // Eliminar WOD
  deleteWOD: async (req, res) => {
    try {
      const { id_wod } = req.params;
      await WODModel.delete(id_wod);

      res.json({
        success: true,
        message: 'WOD eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar WOD:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el WOD',
        error: error.message
      });
    }
  },

  // ==================== HORARIOS ====================

  // Crear horario para un WOD
  createSchedule: async (req, res) => {
    try {
      const { query } = require('../../config/database');
      const { id_wod } = req.params;
      const { hora, cupo_maximo } = req.body;

      const horaErr = validateNotEmpty(hora, 'Hora');
      if (horaErr) return res.status(400).json({ success: false, message: horaErr });

      const cupoErr = validatePositiveInt(cupo_maximo, 'Cupo máximo');
      if (cupoErr) return res.status(400).json({ success: false, message: cupoErr });

      // Obtener id_entrenador del usuario actual
      const entrenadorResult = await query(
        'SELECT id_entrenador FROM entrenador WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      let id_entrenador = null;
      if (entrenadorResult.rows.length > 0) {
        id_entrenador = entrenadorResult.rows[0].id_entrenador;
      }

      const horario = await HorarioClaseModel.create({
        id_wod,
        hora,
        cupo_maximo,
        id_entrenador
      });

      res.status(201).json({
        success: true,
        message: 'Horario creado exitosamente',
        data: horario
      });
    } catch (error) {
      console.error('Error al crear horario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el horario',
        error: error.message
      });
    }
  },

  // Obtener horarios de un WOD
  getSchedulesByWOD: async (req, res) => {
    try {
      const { id_wod } = req.params;
      const horarios = await HorarioClaseModel.findByWOD(id_wod);

      res.json({
        success: true,
        data: horarios
      });
    } catch (error) {
      console.error('Error al obtener horarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los horarios',
        error: error.message
      });
    }
  },

  // Cancelar horario
  cancelSchedule: async (req, res) => {
    try {
      const { id_horario } = req.params;
      const horario = await HorarioClaseModel.cancel(id_horario);

      res.json({
        success: true,
        message: 'Horario cancelado exitosamente',
        data: horario
      });
    } catch (error) {
      console.error('Error al cancelar horario:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar el horario',
        error: error.message
      });
    }
  },

  // ==================== INSCRIPCIONES ====================

  // Inscribirse a un horario
  enrollSchedule: async (req, res) => {
    try {
      const { query } = require('../../config/database');
      const { id_horario } = req.params;
      
      // Obtener id_atleta del usuario actual
      const atletaResult = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (atletaResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no es un atleta'
        });
      }

      const id_atleta = atletaResult.rows[0].id_atleta;

      // Obtener información del horario
      const horario = await HorarioClaseModel.findById(id_horario);

      if (!horario) {
        return res.status(404).json({
          success: false,
          message: 'Horario no encontrado'
        });
      }

      // Verificar si el horario tiene cupo
      if (horario.cupos_disponibles <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Este horario ya no tiene cupos disponibles'
        });
      }

      // Verificar si el atleta ya está inscrito en otro horario del mismo día
      const existingEnrollment = await HorarioClaseModel.checkAthleteEnrolledToday(
        id_atleta,
        horario.fecha
      );

      if (existingEnrollment) {
        return res.status(400).json({
          success: false,
          message: `Ya estás inscrito en el horario de ${existingEnrollment.hora.substring(0, 5)} para este día. Solo puedes inscribirte a un horario por día.`
        });
      }

      // Crear inscripción
      const enrollment = await InscripcionModel.create({
        id_atleta,
        id_horario,
        fecha_inscripcion: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Inscripción exitosa',
        data: enrollment
      });
    } catch (error) {
      console.error('Error al inscribirse:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la inscripción',
        error: error.message
      });
    }
  },

  // Cancelar inscripción a un horario
  unenrollSchedule: async (req, res) => {
    try {
      const { query } = require('../../config/database');
      const { id_horario } = req.params;
      
      // Obtener id_atleta del usuario actual
      const atletaResult = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (atletaResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no es un atleta'
        });
      }

      const id_atleta = atletaResult.rows[0].id_atleta;

      // Buscar inscripción activa
      const sql = `
        SELECT * FROM inscripcion 
        WHERE id_atleta = $1 AND id_horario = $2 AND estado = 'ACTIVA'
      `;
      
      const result = await query(sql, [id_atleta, id_horario]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró una inscripción activa para este horario'
        });
      }

      const inscripcion = result.rows[0];
      await InscripcionModel.cancel(inscripcion.id_inscripcion);

      res.json({
        success: true,
        message: 'Inscripción cancelada exitosamente'
      });
    } catch (error) {
      console.error('Error al cancelar inscripción:', error);
      res.status(500).json({
        success: false,
        message: 'Error al cancelar la inscripción',
        error: error.message
      });
    }
  },

  // Obtener horarios del atleta
  getMySchedules: async (req, res) => {
    try {
      // Obtener id_atleta del usuario actual
      const { query } = require('../../config/database');
      const atletaResult = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (atletaResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no es un atleta'
        });
      }

      const id_atleta = atletaResult.rows[0].id_atleta;

      const sql = `
        SELECT h.*, w.fecha, w.titulo, w.descripcion, w.tipo,
               u.nombre || ' ' || u.apellido as entrenador_nombre,
               i.fecha_inscripcion, i.estado as estado_inscripcion,
               i.asistio, i.fecha_asistencia, i.id_inscripcion
        FROM inscripcion i
        INNER JOIN horario_clase h ON i.id_horario = h.id_horario
        INNER JOIN wod w ON h.id_wod = w.id_wod
        LEFT JOIN entrenador e ON h.id_entrenador = e.id_entrenador
        LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
        WHERE i.id_atleta = $1 AND i.estado = 'ACTIVA'
        ORDER BY w.fecha DESC, h.hora DESC
      `;

      const result = await query(sql, [id_atleta]);
      
      console.log('Horarios del atleta:', result.rows.length);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error al obtener horarios del atleta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener tus horarios',
        error: error.message
      });
    }
  },

  // Obtener inscritos en un horario (solo entrenadores)
  getEnrolledAthletes: async (req, res) => {
    try {
      const { id_horario } = req.params;

      const sql = `
        SELECT a.*, u.nombre, u.apellido, u.email, u.telefono,
               i.fecha_inscripcion, i.estado
        FROM inscripcion i
        INNER JOIN atleta a ON i.id_atleta = a.id_atleta
        INNER JOIN usuario u ON a.id_usuario = u.id_usuario
        WHERE i.id_horario = $1 AND i.estado = 'ACTIVA'
        ORDER BY i.fecha_inscripcion
      `;

      const { query } = require('../../config/database');
      const result = await query(sql, [id_horario]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error('Error al obtener inscritos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los inscritos',
        error: error.message
      });
    }
  },

  // ==================== ASISTENCIAS Y RACHAS ====================

  // Marcar asistencia a un WOD
  marcarAsistencia: async (req, res) => {
    try {
      const { query } = require('../../config/database');
      const { id_inscripcion } = req.params;
      
      // Obtener id_atleta del usuario actual
      const atletaResult = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (atletaResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no es un atleta'
        });
      }

      const id_atleta = atletaResult.rows[0].id_atleta;

      // Verificar que la inscripción pertenece al atleta y esté ACTIVA
      const inscripcionSql = `
        SELECT * FROM inscripcion 
        WHERE id_inscripcion = $1 AND id_atleta = $2
      `;
      const inscripcionResult = await query(inscripcionSql, [id_inscripcion, id_atleta]);

      if (inscripcionResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Inscripción no encontrada'
        });
      }

      const inscripcion = inscripcionResult.rows[0];

      if (inscripcion.estado !== 'ACTIVA') {
        return res.status(400).json({
          success: false,
          message: 'Solo se puede marcar asistencia en inscripciones activas'
        });
      }

      if (inscripcion.asistio) {
        return res.status(400).json({
          success: false,
          message: 'Ya se registró asistencia para esta inscripción'
        });
      }

      // Marcar asistencia y actualizar racha
      const asistencia = await RachaModel.marcarAsistencia(id_inscripcion, id_atleta, true);
      const racha = await RachaModel.getEstadisticasRacha(id_atleta);

      res.json({
        success: true,
        message: 'Asistencia registrada exitosamente',
        data: {
          asistencia,
          racha
        }
      });
    } catch (error) {
      console.error('Error al marcar asistencia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al registrar asistencia',
        error: error.message
      });
    }
  },

  // Obtener racha del atleta
  getRachaAtleta: async (req, res) => {
    try {
      const { query } = require('../../config/database');
      
      // Obtener id_atleta del usuario actual
      const atletaResult = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (atletaResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no es un atleta'
        });
      }

      const id_atleta = atletaResult.rows[0].id_atleta;
      const estadisticas = await RachaModel.getEstadisticasRacha(id_atleta);

      res.json({
        success: true,
        data: estadisticas
      });
    } catch (error) {
      console.error('Error al obtener racha:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener racha del atleta',
        error: error.message
      });
    }
  },

  // Obtener historial de asistencias
  getHistorialAsistencias: async (req, res) => {
    try {
      const { query } = require('../../config/database');
      
      // Obtener id_atleta del usuario actual
      const atletaResult = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [req.user.id_usuario]
      );

      if (atletaResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Usuario no es un atleta'
        });
      }

      const id_atleta = atletaResult.rows[0].id_atleta;
      const limite = req.query.limite || 30;
      const historial = await RachaModel.getHistorialAsistencias(id_atleta, limite);

      res.json({
        success: true,
        data: historial
      });
    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial de asistencias',
        error: error.message
      });
    }
  }
};

module.exports = wodController;
