const MemberModel = require('../models/MemberModel');
const TrainerModel = require('../models/TrainerModel');
const UserModel = require('../models/UserModel');
const AtletaModel = require('../models/AtletaModel');
const EntrenadorModel = require('../models/EntrenadorModel');
const RolModel = require('../models/RolModel');
const ClaseModel = require('../models/ClaseModel');
const { query } = require('../../config/database');
const {
  validateEmail,
  validatePassword,
  validatePhone,
  validateNotEmpty,
  validatePositiveInt,
  validatePositiveDecimal,
  validateDate,
  sanitizeString
} = require('../utils/validators');

const adminController = {
  // ===== CRUD MEMBRESÍAS =====
  getAllMemberships: async (req, res) => {
    try {
      const memberships = await MemberModel.getAllMemberships();
      res.json({ success: true, data: memberships });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener membresías', error: error.message });
    }
  },

  getMembershipById: async (req, res) => {
    try {
      const membership = await MemberModel.getMembershipById(req.params.id);
      if (!membership) {
        return res.status(404).json({ success: false, message: 'Membresía no encontrada' });
      }
      res.json({ success: true, data: membership });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener membresía', error: error.message });
    }
  },

  createMembership: async (req, res) => {
    try {
      const { nombre, descripcion, precio, duracion_dias, beneficios } = req.body;

      const nombreErr = validateNotEmpty(nombre, 'Nombre');
      if (nombreErr) return res.status(400).json({ success: false, message: nombreErr });

      const precioErr = validatePositiveDecimal(precio, 'Precio');
      if (precioErr) return res.status(400).json({ success: false, message: precioErr });

      const duracionErr = validatePositiveInt(duracion_dias, 'Duración en días');
      if (duracionErr) return res.status(400).json({ success: false, message: duracionErr });

      const nombreSanitizado = sanitizeString(nombre);

      const existing = await query('SELECT id_membresia FROM membresia WHERE nombre = $1', [nombreSanitizado]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe una membresía con ese nombre' });
      }

      const sql = `
        INSERT INTO membresia (nombre, descripcion, precio, duracion_dias, beneficios, estado)
        VALUES ($1, $2, $3, $4, $5, true)
        RETURNING *
      `;

      const result = await query(sql, [nombreSanitizado, descripcion, precio, duracion_dias, beneficios]);
      res.status(201).json({ success: true, message: 'Membresía creada', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al crear membresía', error: error.message });
    }
  },

  updateMembership: async (req, res) => {
    try {
      const { nombre, descripcion, precio, duracion_dias, beneficios, estado } = req.body;

      const nombreErr = validateNotEmpty(nombre, 'Nombre');
      if (nombreErr) return res.status(400).json({ success: false, message: nombreErr });

      const precioErr = validatePositiveDecimal(precio, 'Precio');
      if (precioErr) return res.status(400).json({ success: false, message: precioErr });

      const duracionErr = validatePositiveInt(duracion_dias, 'Duración en días');
      if (duracionErr) return res.status(400).json({ success: false, message: duracionErr });

      const nombreSanitizado = sanitizeString(nombre);

      const existing = await query(
        'SELECT id_membresia FROM membresia WHERE nombre = $1 AND id_membresia != $2',
        [nombreSanitizado, req.params.id]
      );
      if (existing.rows.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe una membresía con ese nombre' });
      }

      const sql = `
        UPDATE membresia 
        SET nombre = $1, descripcion = $2, precio = $3, duracion_dias = $4, beneficios = $5, estado = $6
        WHERE id_membresia = $7
        RETURNING *
      `;

      const result = await query(sql, [nombreSanitizado, descripcion, precio, duracion_dias, beneficios, estado, req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Membresía no encontrada' });
      }
      
      res.json({ success: true, message: 'Membresía actualizada', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar membresía', error: error.message });
    }
  },

  deleteMembership: async (req, res) => {
    try {
      const linkedAthletes = await query(
        'SELECT COUNT(*) as count FROM atleta WHERE id_membresia = $1',
        [req.params.id]
      );
      if (parseInt(linkedAthletes.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: `No se puede eliminar: ${linkedAthletes.rows[0].count} atleta(s) tienen esta membresía asignada. Reasigna o cancela sus membresías primero.`
        });
      }

      const sql = `DELETE FROM membresia WHERE id_membresia = $1 RETURNING *`;
      const result = await query(sql, [req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Membresía no encontrada' });
      }
      
      res.json({ success: true, message: 'Membresía eliminada' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al eliminar membresía', error: error.message });
    }
  },

  // ===== CRUD ENTRENADORES =====
  getAllTrainers: async (req, res) => {
    try {
      const trainers = await TrainerModel.getAllTrainers();
      res.json({ success: true, data: trainers });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener entrenadores', error: error.message });
    }
  },

  getTrainerById: async (req, res) => {
    try {
      const trainer = await TrainerModel.getTrainerById(req.params.id);
      if (!trainer) {
        return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
      }
      res.json({ success: true, data: trainer });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener entrenador', error: error.message });
    }
  },

  createTrainer: async (req, res) => {
    try {
      const { nombre, apellido, email, password, especialidad, anios_experiencia, certificaciones, biografia } = req.body;

      const nombreErr = validateNotEmpty(nombre, 'Nombre');
      if (nombreErr) return res.status(400).json({ success: false, message: nombreErr });
      const apellidoErr = validateNotEmpty(apellido, 'Apellido');
      if (apellidoErr) return res.status(400).json({ success: false, message: apellidoErr });
      const emailErr = validateEmail(email);
      if (emailErr) return res.status(400).json({ success: false, message: emailErr });
      const passErr = validatePassword(password);
      if (passErr) return res.status(400).json({ success: false, message: passErr });

      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'El email ya está registrado' });
      }

      // Obtener rol de entrenador
      const rolData = await RolModel.findByName('ENTRENADOR');
      
      // Crear usuario
      const newUser = await UserModel.create({
        nombre,
        apellido,
        email,
        password,
        id_rol: rolData.id_rol
      });
      
      // Crear perfil de entrenador
      await EntrenadorModel.create({
        id_usuario: newUser.id_usuario,
        especialidad,
        anios_experiencia,
        certificaciones,
        biografia
      });
      
      const trainer = await TrainerModel.getTrainerById(newUser.id_usuario);
      res.status(201).json({ success: true, message: 'Entrenador creado', data: trainer });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al crear entrenador', error: error.message });
    }
  },

  updateTrainer: async (req, res) => {
    try {
      const { especialidad, anios_experiencia, certificaciones, biografia } = req.body;
      
      const sql = `
        UPDATE entrenador 
        SET especialidad = $1, anios_experiencia = $2, certificaciones = $3, biografia = $4
        WHERE id_entrenador = $5
        RETURNING *
      `;
      
      const result = await query(sql, [especialidad, anios_experiencia, certificaciones, biografia, req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
      }
      
      res.json({ success: true, message: 'Entrenador actualizado', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar entrenador', error: error.message });
    }
  },

  updateTrainerStatus: async (req, res) => {
    try {
      const { activo } = req.body;
      
      const sql = `
        UPDATE usuario 
        SET estado = $1 
        WHERE id_usuario = (SELECT id_usuario FROM entrenador WHERE id_entrenador = $2)
        RETURNING *
      `;
      
      const result = await query(sql, [activo, req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
      }
      
      res.json({ success: true, message: `Entrenador ${activo ? 'activado' : 'desactivado'} correctamente`, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al cambiar estado del entrenador', error: error.message });
    }
  },

  deleteTrainer: async (req, res) => {
    try {
      const id_entrenador = req.params.id;
      
      // Primero obtener el id_usuario del entrenador
      const trainerQuery = await query(
        'SELECT id_usuario, nombre FROM entrenador e JOIN usuario u ON e.id_usuario = u.id_usuario WHERE id_entrenador = $1',
        [id_entrenador]
      );
      
      if (trainerQuery.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Entrenador no encontrado' });
      }
      
      const { id_usuario, nombre } = trainerQuery.rows[0];
      
      // Eliminar en el orden correcto para evitar errores de FK
      // 1. Eliminar inscripciones de horarios WOD del entrenador
      await query('DELETE FROM inscripcion WHERE id_horario IN (SELECT id_horario FROM horario_clase WHERE id_entrenador = $1)', [id_entrenador]);

      // 2. Eliminar horarios WOD del entrenador
      await query('DELETE FROM horario_clase WHERE id_entrenador = $1', [id_entrenador]);

      // 3. Eliminar inscripciones de clases del entrenador
      await query('DELETE FROM inscripcion WHERE id_clase IN (SELECT id_clase FROM clase WHERE id_entrenador = $1)', [id_entrenador]);

      // 4. Eliminar clases del entrenador
      await query('DELETE FROM clase WHERE id_entrenador = $1', [id_entrenador]);

      // 5. Eliminar el perfil de entrenador
      await query('DELETE FROM entrenador WHERE id_entrenador = $1', [id_entrenador]);

      // 6. Eliminar el usuario
      await query('DELETE FROM usuario WHERE id_usuario = $1', [id_usuario]);
      
      res.json({ 
        success: true, 
        message: `Entrenador "${nombre}" y todas sus clases han sido eliminados permanentemente` 
      });
    } catch (error) {
      console.error('Error eliminando entrenador:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar entrenador', 
        error: error.message 
      });
    }
  },

  // ===== CRUD CLASES =====
  getAllClasses: async (req, res) => {
    try {
      const classes = await ClaseModel.findAll();
      res.json({ success: true, data: classes });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener clases', error: error.message });
    }
  },

  getClassById: async (req, res) => {
    try {
      const classData = await ClaseModel.findById(req.params.id);
      if (!classData) {
        return res.status(404).json({ success: false, message: 'Clase no encontrada' });
      }
      res.json({ success: true, data: classData });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener clase', error: error.message });
    }
  },

  createClass: async (req, res) => {
    try {
      const { id_entrenador, fecha, hora } = req.body;
      
      console.log('📅 Validando horario:', { id_entrenador, fecha, hora });
      
      // Verificar choque de horarios
      const conflict = await ClaseModel.checkScheduleConflict(id_entrenador, fecha, hora);
      
      if (conflict) {
        console.log('⚠️ Conflicto detectado:', conflict);
        return res.status(400).json({ 
          success: false, 
          message: `El entrenador ya tiene una clase programada el ${fecha} a las ${hora.substring(0, 5)}. Clase: "${conflict.nombre}"` 
        });
      }
      
      console.log('✅ Sin conflictos, creando clase...');
      const newClass = await ClaseModel.create(req.body);
      res.status(201).json({ success: true, message: 'Clase creada', data: newClass });
    } catch (error) {
      console.error('❌ Error al crear clase:', error);
      res.status(500).json({ success: false, message: 'Error al crear clase', error: error.message });
    }
  },

  updateClass: async (req, res) => {
    try {
      const { id_entrenador, fecha, hora } = req.body;
      const id_clase = req.params.id;
      
      console.log('📅 Validando horario para actualización:', { id_entrenador, fecha, hora, id_clase });
      
      // Verificar choque de horarios (excluyendo la clase actual)
      if (id_entrenador && fecha && hora) {
        const conflict = await ClaseModel.checkScheduleConflict(id_entrenador, fecha, hora, id_clase);
        if (conflict) {
          console.log('⚠️ Conflicto detectado:', conflict);
          return res.status(400).json({ 
            success: false, 
            message: `El entrenador ya tiene una clase programada el ${fecha} a las ${hora.substring(0, 5)}. Clase: "${conflict.nombre}"` 
          });
        }
      }
      
      console.log('✅ Sin conflictos, actualizando clase...');
      const updatedClass = await ClaseModel.update(id_clase, req.body);
      if (!updatedClass) {
        return res.status(404).json({ success: false, message: 'Clase no encontrada' });
      }
      res.json({ success: true, message: 'Clase actualizada', data: updatedClass });
    } catch (error) {
      console.error('❌ Error al actualizar clase:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar clase', error: error.message });
    }
  },

  deleteClass: async (req, res) => {
    try {
      const sql = `UPDATE clase SET estado = 'CANCELADA' WHERE id_clase = $1 RETURNING *`;
      const result = await query(sql, [req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Clase no encontrada' });
      }
      
      res.json({ success: true, message: 'Clase cancelada' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al cancelar clase', error: error.message });
    }
  },

  reactivateClass: async (req, res) => {
    try {
      const existingClass = await ClaseModel.findById(req.params.id);
      if (!existingClass) {
        return res.status(404).json({ success: false, message: 'Clase no encontrada' });
      }

      const conflict = await ClaseModel.checkScheduleConflict(
        existingClass.id_entrenador,
        existingClass.fecha,
        existingClass.hora
      );
      if (conflict && conflict.id_clase != req.params.id) {
        return res.status(400).json({
          success: false,
          message: `El entrenador ya tiene una clase programada el ${conflict.fecha} a las ${conflict.hora}. Clase: "${conflict.nombre}"`
        });
      }

      const sql = `UPDATE clase SET estado = 'ACTIVA' WHERE id_clase = $1 RETURNING *`;
      const result = await query(sql, [req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Clase no encontrada' });
      }
      
      res.json({ success: true, message: 'Clase activada' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al activar clase', error: error.message });
    }
  },

  deleteClassPermanently: async (req, res) => {
    try {
      const id_clase = req.params.id;
      
      // Primero eliminar todas las inscripciones de la clase
      await query('DELETE FROM inscripcion WHERE id_clase = $1', [id_clase]);
      
      // Luego eliminar la clase
      await ClaseModel.delete(id_clase);
      
      res.json({ success: true, message: 'Clase eliminada permanentemente' });
    } catch (error) {
      console.error('❌ Error al eliminar clase:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar clase', error: error.message });
    }
  },

  // ===== GESTIÓN DE ATLETAS =====
  getAllAthletes: async (req, res) => {
    try {
      console.log('👥 Obteniendo lista de atletas...');
      const athletes = await MemberModel.getAllMembers();
      console.log(`✅ Atletas obtenidos: ${athletes.length}`);
      console.log('Datos:', athletes);
      res.json({ success: true, data: athletes });
    } catch (error) {
      console.error('❌ Error al obtener atletas:', error);
      res.status(500).json({ success: false, message: 'Error al obtener atletas', error: error.message });
    }
  },

  updateAthleteStatus: async (req, res) => {
    try {
      const { id_atleta } = req.params;
      const { activo } = req.body;
      
      // Obtener id_usuario del atleta
      const atletaQuery = await query(
        'SELECT a.id_usuario, a.fecha_inicio_membresia, a.fecha_fin_membresia, a.id_membresia, m.estado as membresia_activa FROM atleta a LEFT JOIN membresia m ON a.id_membresia = m.id_membresia WHERE id_atleta = $1',
        [id_atleta]
      );

      if (atletaQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Atleta no encontrado'
        });
      }

      const { id_usuario, fecha_inicio_membresia, fecha_fin_membresia, id_membresia, membresia_activa } = atletaQuery.rows[0];

      // Si se intenta activar, verificar que tenga membresía vigente
      if (activo) {
        if (!id_membresia) {
          return res.status(400).json({
            success: false,
            message: 'No se puede activar un atleta sin membresía asignada. Asigna una membresía primero.'
          });
        }

        if (!membresia_activa) {
          return res.status(400).json({
            success: false,
            message: 'No se puede activar: la membresía asignada está inactiva. Usa una membresía activa.'
          });
        }

        if (!fecha_inicio_membresia || !fecha_fin_membresia) {
          return res.status(400).json({
            success: false,
            message: 'No se puede activar: la membresía no tiene vigencia asignada. Asigna fechas de inicio y fin.'
          });
        }

        const fechaFin = new Date(fecha_fin_membresia);
        const hoy = new Date();

        if (fechaFin < hoy) {
          return res.status(400).json({
            success: false,
            message: 'No se puede activar un atleta con membresía vencida. Asigna una nueva membresía primero.'
          });
        }
      }

      // Actualizar estado del usuario
      const updated = await UserModel.updateStatus(id_usuario, activo);
      
      res.json({
        success: true,
        message: `Atleta ${activo ? 'activado' : 'desactivado'} correctamente`,
        data: updated
      });
    } catch (error) {
      console.error('Error al actualizar estado del atleta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar estado del atleta',
        error: error.message
      });
    }
  },

  getAthleteById: async (req, res) => {
    try {
      const athlete = await AtletaModel.findById(req.params.id);
      if (!athlete) {
        return res.status(404).json({ success: false, message: 'Atleta no encontrado' });
      }
      res.json({ success: true, data: athlete });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener atleta', error: error.message });
    }
  },

  createAthlete: async (req, res) => {
    try {
      const bcrypt = require('bcryptjs');
      const { nombre, apellido, email, password, fecha_nacimiento, telefono, direccion, contacto_emergencia } = req.body;

      const nombreErr = validateNotEmpty(nombre, 'Nombre');
      if (nombreErr) return res.status(400).json({ success: false, message: nombreErr });
      const apellidoErr = validateNotEmpty(apellido, 'Apellido');
      if (apellidoErr) return res.status(400).json({ success: false, message: apellidoErr });
      const emailErr = validateEmail(email);
      if (emailErr) return res.status(400).json({ success: false, message: emailErr });
      const passErr = validatePassword(password);
      if (passErr) return res.status(400).json({ success: false, message: passErr });

      const phoneErr = validatePhone(telefono);
      if (phoneErr) return res.status(400).json({ success: false, message: phoneErr });

      if (fecha_nacimiento) {
        const fechaErr = validateDate(fecha_nacimiento, 'Fecha de nacimiento', { notFuture: true, minAge: 10, maxAge: 100 });
        if (fechaErr) return res.status(400).json({ success: false, message: fechaErr });
      }

      // Verificar que el email no exista
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'El email ya está registrado' });
      }

      // Obtener rol ATLETA
      const rolAtleta = await RolModel.findByName('ATLETA');
      if (!rolAtleta) {
        return res.status(500).json({ success: false, message: 'Rol ATLETA no encontrado' });
      }

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Crear usuario
      const sqlUser = `
        INSERT INTO usuario (nombre, apellido, email, password, id_rol, telefono, estado)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING *
      `;
      const userResult = await query(sqlUser, [nombre, apellido, email, hashedPassword, rolAtleta.id_rol, telefono]);
      const user = userResult.rows[0];

      // Crear atleta
      const sqlAtleta = `
        INSERT INTO atleta (id_usuario, fecha_nacimiento, direccion, contacto_emergencia)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const athleteResult = await query(sqlAtleta, [user.id_usuario, fecha_nacimiento, direccion, contacto_emergencia]);

      res.status(201).json({ 
        success: true, 
        message: 'Atleta creado exitosamente', 
        data: { ...athleteResult.rows[0], ...user } 
      });
    } catch (error) {
      console.error('Error creating athlete:', error);
      res.status(500).json({ success: false, message: 'Error al crear atleta', error: error.message });
    }
  },

  updateAthlete: async (req, res) => {
    try {
      const bcrypt = require('bcryptjs');
      const { nombre, apellido, email, password, fecha_nacimiento, telefono, direccion, contacto_emergencia } = req.body;
      const athleteId = req.params.id;

      // Obtener usuario asociado al atleta
      const sqlGetUser = `SELECT id_usuario FROM atleta WHERE id_atleta = $1`;
      const userIdResult = await query(sqlGetUser, [athleteId]);
      
      if (userIdResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Atleta no encontrado' });
      }
      
      const userId = userIdResult.rows[0].id_usuario;

      // Actualizar usuario
      let sqlUser, paramsUser;

      if (email) {
        const otherUser = await query(
          'SELECT id_usuario FROM usuario WHERE email = $1 AND id_usuario != $2',
          [email, userId]
        );
        if (otherUser.rows.length > 0) {
          return res.status(400).json({ success: false, message: 'El email ya está en uso por otro usuario' });
        }
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        sqlUser = `
          UPDATE usuario 
          SET nombre = $1, apellido = $2, email = $3, password = $4, telefono = $5
          WHERE id_usuario = $6
          RETURNING *
        `;
        paramsUser = [nombre, apellido, email, hashedPassword, telefono, userId];
      } else {
        sqlUser = `
          UPDATE usuario 
          SET nombre = $1, apellido = $2, email = $3, telefono = $4
          WHERE id_usuario = $5
          RETURNING *
        `;
        paramsUser = [nombre, apellido, email, telefono, userId];
      }
      
      await query(sqlUser, paramsUser);

      // Actualizar atleta
      const sqlAtleta = `
        UPDATE atleta 
        SET fecha_nacimiento = $1, direccion = $2, contacto_emergencia = $3
        WHERE id_atleta = $4
        RETURNING *
      `;
      const athleteResult = await query(sqlAtleta, [fecha_nacimiento, direccion, contacto_emergencia, athleteId]);

      res.json({ 
        success: true, 
        message: 'Atleta actualizado exitosamente', 
        data: athleteResult.rows[0] 
      });
    } catch (error) {
      console.error('Error updating athlete:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar atleta', error: error.message });
    }
  },

  updateAthleteMembership: async (req, res) => {
    try {
      const { id_membresia, fecha_inicio } = req.body;

      if (fecha_inicio) {
        const fechaErr = validateDate(fecha_inicio, 'Fecha de inicio');
        if (fechaErr) return res.status(400).json({ success: false, message: fechaErr });
      }

      // Obtener duración de la membresía
      const membresiaSql = 'SELECT duracion_dias FROM membresia WHERE id_membresia = $1';
      const membresiaResult = await query(membresiaSql, [id_membresia]);
      
      if (membresiaResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Membresía no encontrada' });
      }
      
      const duracionDias = membresiaResult.rows[0].duracion_dias;
      const fechaInicio = fecha_inicio || new Date();
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + duracionDias);
      
      const sql = `
        UPDATE atleta 
        SET id_membresia = $1, fecha_inicio_membresia = $2, fecha_fin_membresia = $3
        WHERE id_atleta = $4
        RETURNING *
      `;
      
      const result = await query(sql, [id_membresia, fechaInicio, fechaFin, req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Atleta no encontrado' });
      }
      
      res.json({ success: true, message: 'Membresía actualizada', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar membresía', error: error.message });
    }
  },

  updateAthleteStatus: async (req, res) => {
    try {
      const { estado, activo } = req.body;
      const nuevoEstado = estado !== undefined ? estado : activo;
      
      const sql = `
        UPDATE usuario 
        SET estado = $1 
        WHERE id_usuario = (SELECT id_usuario FROM atleta WHERE id_atleta = $2)
        RETURNING *
      `;
      
      const result = await query(sql, [nuevoEstado, req.params.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Atleta no encontrado' });
      }
      
      res.json({ success: true, message: 'Estado actualizado', data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar estado', error: error.message });
    }
  },

  deleteAthlete: async (req, res) => {
    const client = await require('../config/database').pool.connect();
    try {
      const { id } = req.params;
      
      await client.query('BEGIN');
      
      // Obtener id_usuario del atleta
      const atletaQuery = await client.query(
        'SELECT id_usuario FROM atleta WHERE id_atleta = $1',
        [id]
      );
      
      if (atletaQuery.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Atleta no encontrado' });
      }
      
      const { id_usuario } = atletaQuery.rows[0];
      
      console.log(`🗑️ Eliminando atleta ID: ${id}, usuario ID: ${id_usuario}`);
      
      // 1. Eliminar inscripciones del atleta
      const inscripcionesResult = await client.query('DELETE FROM inscripcion WHERE id_atleta = $1', [id]);
      console.log(`✓ Inscripciones eliminadas: ${inscripcionesResult.rowCount}`);
      
      // 2. Eliminar racha del atleta (si existe)
      const rachaResult = await client.query('DELETE FROM racha WHERE id_atleta = $1', [id]);
      console.log(`✓ Racha eliminada: ${rachaResult.rowCount}`);
      
      // 3. Eliminar progreso del atleta (si existe)
      const progresoResult = await client.query('DELETE FROM progreso_atleta WHERE id_atleta = $1', [id]);
      console.log(`✓ Progreso eliminado: ${progresoResult.rowCount}`);
      
      // 4. Eliminar perfil de atleta
      const atletaResult = await client.query('DELETE FROM atleta WHERE id_atleta = $1', [id]);
      console.log(`✓ Atleta eliminado: ${atletaResult.rowCount}`);
      
      // 5. Eliminar usuario
      const usuarioResult = await client.query('DELETE FROM usuario WHERE id_usuario = $1', [id_usuario]);
      console.log(`✓ Usuario eliminado: ${usuarioResult.rowCount}`);
      
      await client.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Atleta eliminado exitosamente',
        details: {
          inscripciones: inscripcionesResult.rowCount,
          racha: rachaResult.rowCount,
          progreso: progresoResult.rowCount
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error al eliminar atleta:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ 
        success: false, 
        message: 'Error al eliminar atleta', 
        error: error.message,
        detail: error.detail
      });
    } finally {
      client.release();
    }
  },

  // ===== ESTADÍSTICAS =====
  getStats: async (req, res) => {
    try {
      const stats = {
        totalAthletes: 0,
        activeAthletes: 0,
        totalTrainers: 0,
        totalWODs: 0,
        totalMemberships: 0
      };
      
      // Total y atletas activos
      const athletesResult = await query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN u.estado = true THEN 1 END) as activos
        FROM atleta a
        INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      `);
      stats.totalAthletes = parseInt(athletesResult.rows[0].total);
      stats.activeAthletes = parseInt(athletesResult.rows[0].activos);
      
      // Total entrenadores
      const trainersResult = await query(`SELECT COUNT(*) as total FROM entrenador`);
      stats.totalTrainers = parseInt(trainersResult.rows[0].total);
      
      // Total WODs programados (futuros o actuales)
      const wodsResult = await query(`SELECT COUNT(*) as total FROM wod WHERE fecha >= CURRENT_DATE`);
      stats.totalWODs = parseInt(wodsResult.rows[0].total);
      
      // Total membresías
      const membershipsResult = await query(`SELECT COUNT(*) as total FROM membresia WHERE estado = true`);
      stats.totalMemberships = parseInt(membershipsResult.rows[0].total);
      
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas', error: error.message });
    }
  },

  // ===== GESTIÓN DE MEMBRESÍAS DE ATLETAS =====
  assignMembership: async (req, res) => {
    try {
      const { id_atleta, id_membresia, fecha_inicio } = req.body;
      
      if (!id_atleta || !id_membresia || !fecha_inicio) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere id_atleta, id_membresia y fecha_inicio'
        });
      }

      const fechaErr = validateDate(fecha_inicio, 'Fecha de inicio');
      if (fechaErr) return res.status(400).json({ success: false, message: fechaErr });

      const atletaExists = await query('SELECT id_atleta FROM atleta WHERE id_atleta = $1', [id_atleta]);
      if (atletaExists.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Atleta no encontrado' });
      }

      // Obtener la membresía para saber la duración
      const membershipQuery = await query(
        'SELECT duracion_dias FROM membresia WHERE id_membresia = $1',
        [id_membresia]
      );

      if (membershipQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      const duracionDias = membershipQuery.rows[0].duracion_dias;
      
      // Calcular fecha fin
      const fechaInicio = new Date(fecha_inicio);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + duracionDias);

      // Actualizar membresía del atleta
      const updated = await AtletaModel.updateMembership(
        id_atleta,
        id_membresia,
        fechaInicio.toISOString().split('T')[0],
        fechaFin.toISOString().split('T')[0]
      );

      // Activar usuario si estaba desactivado
      const atletaQuery = await query(
        'SELECT id_usuario FROM atleta WHERE id_atleta = $1',
        [id_atleta]
      );
      
      if (atletaQuery.rows.length > 0) {
        await UserModel.updateStatus(atletaQuery.rows[0].id_usuario, true);
      }

      res.json({
        success: true,
        message: 'Membresía asignada y usuario activado correctamente',
        data: updated
      });
    } catch (error) {
      console.error('Error al asignar membresía:', error);
      res.status(500).json({
        success: false,
        message: 'Error al asignar membresía',
        error: error.message
      });
    }
  },

  getExpiredMemberships: async (req, res) => {
    try {
      const expired = await AtletaModel.getExpiredMemberships();
      res.json({
        success: true,
        data: expired,
        count: expired.length
      });
    } catch (error) {
      console.error('Error al obtener membresías vencidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías vencidas',
        error: error.message
      });
    }
  },

  deactivateExpiredMemberships: async (req, res) => {
    try {
      const deactivated = await AtletaModel.deactivateExpiredMemberships();
      res.json({
        success: true,
        message: `${deactivated.length} atleta(s) desactivado(s) por membresía vencida`,
        data: deactivated
      });
    } catch (error) {
      console.error('Error al desactivar membresías vencidas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al desactivar membresías vencidas',
        error: error.message
      });
    }
  }
};

module.exports = adminController;
