const TrainerModel = require('../models/TrainerModel');
const ClaseModel = require('../models/ClaseModel');
const { query } = require('../../config/database');

// Controlador para entrenadores
const trainersController = {
  // Obtener todos los entrenadores
  getAllTrainers: async (req, res) => {
    try {
      const trainers = await TrainerModel.getAllTrainers();
      res.json({
        success: true,
        data: trainers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los entrenadores',
        error: error.message
      });
    }
  },

  // Obtener entrenador por ID
  getTrainerById: async (req, res) => {
    try {
      const { id } = req.params;
      const trainer = await TrainerModel.getTrainerById(id);
      
      if (!trainer) {
        return res.status(404).json({
          success: false,
          message: 'Entrenador no encontrado'
        });
      }

      res.json({
        success: true,
        data: trainer
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener el entrenador',
        error: error.message
      });
    }
  },

  // Obtener entrenadores por especialidad
  getTrainersBySpecialty: async (req, res) => {
    try {
      const { specialty } = req.params;
      const trainers = await TrainerModel.getTrainersBySpecialty(specialty);
      
      res.json({
        success: true,
        data: trainers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los entrenadores por especialidad',
        error: error.message
      });
    }
  },

  // Obtener clases del entrenador actual
  getMyClasses: async (req, res) => {
    try {
      const id_usuario = req.user.id_usuario;
      
      // Obtener id_entrenador del usuario
      const result = await query(
        'SELECT id_entrenador FROM entrenador WHERE id_usuario = $1',
        [id_usuario]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontró perfil de entrenador'
        });
      }

      const { id_entrenador } = result.rows[0];
      const classes = await ClaseModel.findByTrainer(id_entrenador);
      
      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener las clases del entrenador',
        error: error.message
      });
    }
  },

  // Obtener WODs del entrenador actual
  getMyWODs: async (req, res) => {
    try {
      const id_usuario = req.user.id_usuario;
      
      // Obtener id_entrenador del usuario
      const result = await query(
        'SELECT id_entrenador FROM entrenador WHERE id_usuario = $1',
        [id_usuario]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontró perfil de entrenador'
        });
      }

      const { id_entrenador } = result.rows[0];
      
      // Obtener WODs donde el entrenador tiene horarios asignados (solo horarios activos)
      const wods = await query(`
        SELECT DISTINCT 
          w.id_wod,
          w.fecha,
          w.titulo,
          w.descripcion,
          w.tipo,
          w.nivel,
          hc.id_horario,
          hc.hora,
          hc.cupo_maximo,
          hc.estado as horario_estado,
          (SELECT COUNT(*) FROM inscripcion i WHERE i.id_horario = hc.id_horario AND i.estado = 'ACTIVA') as inscritos
        FROM wod w
        JOIN horario_clase hc ON w.id_wod = hc.id_wod
        WHERE hc.id_entrenador = $1 AND hc.estado = 'ACTIVO'
        ORDER BY w.fecha DESC, hc.hora ASC
      `, [id_entrenador]);
      
      // Agrupar horarios por WOD
      const wodsMap = new Map();
      wods.rows.forEach(row => {
        if (!wodsMap.has(row.id_wod)) {
          wodsMap.set(row.id_wod, {
            id_wod: row.id_wod,
            fecha: row.fecha,
            titulo: row.titulo,
            descripcion: row.descripcion,
            tipo: row.tipo,
            nivel: row.nivel,
            horarios: []
          });
        }
        wodsMap.get(row.id_wod).horarios.push({
          id_horario: row.id_horario,
          hora: row.hora,
          cupo_maximo: row.cupo_maximo,
          inscritos: parseInt(row.inscritos)
        });
      });
      
      const wodsArray = Array.from(wodsMap.values());
      
      res.json({
        success: true,
        data: wodsArray
      });
    } catch (error) {
      console.error('Error en getMyWODs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los WODs del entrenador',
        error: error.message
      });
    }
  },

  // Obtener atletas del entrenador actual
  getMyAthletes: async (req, res) => {
    try {
      const id_usuario = req.user.id_usuario;
      
      // Obtener id_entrenador del usuario
      const result = await query(
        'SELECT id_entrenador FROM entrenador WHERE id_usuario = $1',
        [id_usuario]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontró perfil de entrenador'
        });
      }

      const { id_entrenador } = result.rows[0];
      
      // Obtener atletas únicos que están inscritos en WODs del entrenador
      const athletes = await query(`
        SELECT DISTINCT 
          a.id_atleta,
          u.nombre,
          u.apellido,
          u.email,
          u.foto_perfil,
          COUNT(DISTINCT i.id_inscripcion) as total_inscripciones,
          MAX(w.fecha) as ultima_clase
        FROM atleta a
        JOIN usuario u ON a.id_usuario = u.id_usuario
        JOIN inscripcion i ON a.id_atleta = i.id_atleta
        JOIN horario_clase hc ON i.id_horario = hc.id_horario
        JOIN wod w ON hc.id_wod = w.id_wod
        WHERE hc.id_entrenador = $1
        GROUP BY a.id_atleta, u.nombre, u.apellido, u.email, u.foto_perfil
        ORDER BY u.nombre, u.apellido
      `, [id_entrenador]);
      
      res.json({
        success: true,
        data: athletes.rows
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los atletas del entrenador',
        error: error.message
      });
    }
  }
};

module.exports = trainersController;
