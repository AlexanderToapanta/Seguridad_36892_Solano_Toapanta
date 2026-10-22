const ClaseModel = require('../models/ClaseModel');
const InscripcionModel = require('../models/InscripcionModel');
const {
  validateNotEmpty,
  validatePositiveInt,
  validateDate,
  sanitizeString
} = require('../utils/validators');

// Controlador para las clases
const classesController = {
  // Obtener todas las clases
  getAllClasses: async (req, res) => {
    try {
      const classes = await ClaseModel.findAll();
      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener las clases',
        error: error.message
      });
    }
  },

  // Obtener clase por ID
  getClassById: async (req, res) => {
    try {
      const { id } = req.params;
      const classId = parseInt(id, 10);

      if (isNaN(classId) || !/^\d+$/.test(String(id).trim())) {
        return res.status(400).json({
          success: false,
          message: 'Identificador de clase inválido. Debe ser un número entero.'
        });
      }

      const classData = await ClaseModel.findById(classId);

      if (!classData) {
        return res.status(404).json({
          success: false,
          message: 'Clase no encontrada'
        });
      }

      res.json({
        success: true,
        data: classData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener la clase'
      });
    }
  },

  // Obtener clases disponibles
  getAvailableClasses: async (req, res) => {
    try {
      const classes = await ClaseModel.findAvailable();
      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener las clases disponibles',
        error: error.message
      });
    }
  },

  // Crear nueva clase (solo entrenadores y admins)
  createClass: async (req, res) => {
    try {
      const classData = req.body;
      const { id_entrenador, fecha, hora, nombre, cupo_maximo } = classData;

      const nombreErr = validateNotEmpty(nombre, 'Nombre de la clase');
      if (nombreErr) return res.status(400).json({ success: false, message: nombreErr });

      const cupoErr = validatePositiveInt(cupo_maximo, 'Cupo máximo');
      if (cupoErr) return res.status(400).json({ success: false, message: cupoErr });

      const fechaErr = validateDate(fecha, 'Fecha', { notPast: true });
      if (fechaErr) return res.status(400).json({ success: false, message: fechaErr });

      const entrenadorErr = validateNotEmpty(id_entrenador, 'ID Entrenador');
      if (entrenadorErr) return res.status(400).json({ success: false, message: entrenadorErr });

      const { query } = require('../../config/database');
      const entrenadorExists = await query('SELECT id_entrenador FROM entrenador WHERE id_entrenador = $1', [id_entrenador]);
      if (entrenadorExists.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
      }

      console.log('📅 [ENTRENADOR] Validando horario:', { id_entrenador, fecha, hora });

      // Verificar choque de horarios
      const conflict = await ClaseModel.checkScheduleConflict(id_entrenador, fecha, hora);
      if (conflict) {
        console.log('⚠️ [ENTRENADOR] Conflicto detectado:', conflict);
        return res.status(400).json({
          success: false,
          message: `Ya tienes una clase programada el ${fecha} a las ${hora.substring(0, 5)}. Clase: "${conflict.nombre}"`
        });
      }

      console.log('✅ [ENTRENADOR] Sin conflictos, creando clase...');
      const newClass = await ClaseModel.create(classData);

      res.status(201).json({
        success: true,
        message: 'Clase creada exitosamente',
        data: newClass
      });
    } catch (error) {
      console.error('❌ [ENTRENADOR] Error al crear clase:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear la clase',
        error: error.message
      });
    }
  },

  // Actualizar clase
  updateClass: async (req, res) => {
    try {
      const { id } = req.params;
      const { id_entrenador, fecha, hora } = req.body;

      // Verificar choque de horarios (excluyendo la clase actual)
      if (id_entrenador && fecha && hora) {
        const conflict = await ClaseModel.checkScheduleConflict(id_entrenador, fecha, hora, id);
        if (conflict) {
          return res.status(400).json({
            success: false,
            message: `El entrenador ya tiene una clase programada el ${fecha} a las ${hora.substring(0, 5)}. Clase: "${conflict.nombre}"`
          });
        }
      }

      const updatedClass = await ClaseModel.update(id, req.body);

      res.json({
        success: true,
        message: 'Clase actualizada exitosamente',
        data: updatedClass
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la clase',
        error: error.message
      });
    }
  },

  // Eliminar clase
  deleteClass: async (req, res) => {
    try {
      const { id } = req.params;
      await ClaseModel.delete(id);

      res.json({
        success: true,
        message: 'Clase eliminada exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la clase',
        error: error.message
      });
    }
  },

  // Inscribirse a una clase (solo atletas)
  enrollClass: async (req, res) => {
    try {
      const { id_clase } = req.body;
      const id_usuario = req.user.id_usuario;

      // Obtener id_atleta del usuario
      const { query } = require('../../config/database');
      const result = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [id_usuario]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se encontró perfil de atleta'
        });
      }

      const { id_atleta } = result.rows[0];

      const classData = await ClaseModel.findById(id_clase);
      if (!classData) {
        return res.status(404).json({ success: false, message: 'Clase no encontrada' });
      }

      if (classData.estado !== 'ACTIVA') {
        return res.status(400).json({ success: false, message: 'No puedes inscribirte a una clase no activa' });
      }

      const ahora = new Date();
      const fechaClase = new Date(classData.fecha + 'T' + classData.hora);
      if (fechaClase < ahora) {
        return res.status(400).json({ success: false, message: 'No puedes inscribirte a una clase pasada' });
      }

      const inscripcion = await InscripcionModel.create({
        id_atleta,
        id_clase
      });

      res.status(201).json({
        success: true,
        message: 'Inscripción exitosa',
        data: inscripcion
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Error al inscribirse a la clase',
        error: error.message
      });
    }
  },

  // Cancelar inscripción
  cancelEnrollment: async (req, res) => {
    try {
      const { id } = req.params;
      const canceledInscripcion = await InscripcionModel.cancel(id);

      res.json({
        success: true,
        message: 'Inscripción cancelada exitosamente',
        data: canceledInscripcion
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al cancelar inscripción',
        error: error.message
      });
    }
  },

  // Eliminar inscripción permanentemente (para clases vencidas)
  deleteEnrollment: async (req, res) => {
    try {
      const { id } = req.params;
      await InscripcionModel.delete(id);

      res.json({
        success: true,
        message: 'Inscripción eliminada exitosamente'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al eliminar inscripción',
        error: error.message
      });
    }
  },

  // Obtener inscritos de una clase
  getEnrolledStudents: async (req, res) => {
    try {
      const { id } = req.params;
      const students = await InscripcionModel.findByClase(id);

      res.json({
        success: true,
        data: students
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los inscritos',
        error: error.message
      });
    }
  },

  // Obtener clases del atleta actual
  getMyClasses: async (req, res) => {
    try {
      console.log('🏗️ Obteniendo clases del atleta...');
      const id_usuario = req.user.id_usuario;
      console.log('ID Usuario:', id_usuario);

      // Obtener id_atleta del usuario
      const { query } = require('../../config/database');
      const result = await query(
        'SELECT id_atleta FROM atleta WHERE id_usuario = $1',
        [id_usuario]
      );

      if (result.rows.length === 0) {
        console.log('⚠️ No se encontró perfil de atleta para usuario:', id_usuario);
        return res.status(400).json({
          success: false,
          message: 'No se encontró perfil de atleta'
        });
      }

      const { id_atleta } = result.rows[0];
      console.log('ID Atleta:', id_atleta);

      const classes = await InscripcionModel.findByAtleta(id_atleta);
      console.log(`✅ Clases encontradas: ${classes.length}`);
      console.log('Clases:', classes);

      res.json({
        success: true,
        data: classes
      });
    } catch (error) {
      console.error('❌ Error al obtener clases del atleta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener tus clases',
        error: error.message
      });
    }
  },

  // Eliminar clases vencidas (tarea de mantenimiento)
  deleteExpiredClasses: async (req, res) => {
    try {
      console.log('🗑️ Eliminando clases vencidas...');
      const deletedClasses = await ClaseModel.deleteExpiredClasses();
      console.log(`✅ Clases vencidas eliminadas: ${deletedClasses.length}`);

      res.json({
        success: true,
        message: `${deletedClasses.length} clases vencidas eliminadas`,
        data: deletedClasses
      });
    } catch (error) {
      console.error('❌ Error al eliminar clases vencidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar clases vencidas',
        error: error.message
      });
    }
  }
};

module.exports = classesController;
