const UserModel = require('../models/UserModel');
const RolModel = require('../models/RolModel');
const AtletaModel = require('../models/AtletaModel');
const EntrenadorModel = require('../models/EntrenadorModel');
const MemberModel = require('../models/MemberModel');
const jwt = require('jsonwebtoken');
const {
  validateEmail,
  validatePassword,
  validatePhone,
  validateNotEmpty,
  validateWeightPeso,
  validateHeightAltura,
  sanitizeString
} = require('../utils/validators');

const authController = {
  // Registrar nuevo usuario
  register: async (req, res) => {
    try {
      const { 
        nombre, apellido, email, password, rol, telefono,
        peso, altura, especialidad, anios_experiencia, id_membresia 
      } = req.body;

      // Validaciones
      if (!nombre || !apellido || !email || !password || !rol) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      const emailErr = validateEmail(email);
      if (emailErr) return res.status(400).json({ success: false, message: emailErr });

      const passErr = validatePassword(password);
      if (passErr) return res.status(400).json({ success: false, message: passErr });

      const phoneErr = validatePhone(telefono);
      if (phoneErr) return res.status(400).json({ success: false, message: phoneErr });

      const pesoErr = validateWeightPeso(peso);
      if (pesoErr) return res.status(400).json({ success: false, message: pesoErr });

      const alturaErr = validateHeightAltura(altura);
      if (alturaErr) return res.status(400).json({ success: false, message: alturaErr });

      const nombreLengthErr = validateNotEmpty(nombre, 'Nombre') ||
        require('../utils/validators').validateMaxLength(nombre, 50, 'Nombre');
      if (nombreLengthErr) return res.status(400).json({ success: false, message: nombreLengthErr });

      const apellidoLengthErr = validateNotEmpty(apellido, 'Apellido') ||
        require('../utils/validators').validateMaxLength(apellido, 50, 'Apellido');
      if (apellidoLengthErr) return res.status(400).json({ success: false, message: apellidoLengthErr });

      // Verificar si el email ya existe
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El email ya está registrado'
        });
      }

      // Obtener rol
      const rolData = await RolModel.findByName(rol.toUpperCase());
      if (!rolData) {
        return res.status(400).json({
          success: false,
          message: 'Rol inválido'
        });
      }

      // Crear usuario
      const newUser = await UserModel.create({
        nombre,
        apellido,
        email,
        password,
        id_rol: rolData.id_rol,
        telefono
      });

      if (!newUser) {
        throw new Error('No se pudo crear el usuario');
      }

      // Si es ATLETA y seleccionó membresía, desactivar usuario hasta aprobación del admin
      if (rol.toUpperCase() === 'ATLETA') {
        // Crear perfil de atleta con membresía seleccionada
        await AtletaModel.create({
          id_usuario: newUser.id_usuario,
          peso,
          altura
        });

        // Si seleccionó membresía, verificar que exista y esté activa
        if (id_membresia) {
          const membership = await MemberModel.getMembershipById(id_membresia);
          if (!membership || !membership.estado) {
            return res.status(400).json({
              success: false,
              message: 'La membresía seleccionada no existe o no está disponible'
            });
          }

          const { query } = require('../../config/database');
          await query(
            'UPDATE atleta SET id_membresia = $1 WHERE id_usuario = $2',
            [id_membresia, newUser.id_usuario]
          );

          // Desactivar usuario hasta que el admin lo apruebe
          await UserModel.updateStatus(newUser.id_usuario, false);

          return res.status(201).json({
            success: true,
            message: 'Registro exitoso. Tu cuenta será activada por un administrador una vez procesado tu pago de membresía.',
            data: {
              id_usuario: newUser.id_usuario,
              nombre: newUser.nombre,
              apellido: newUser.apellido,
              email: newUser.email,
              needsActivation: true
            }
          });
        }
      }

      if (rol.toUpperCase() === 'ENTRENADOR') {
        await EntrenadorModel.create({
          id_usuario: newUser.id_usuario,
          especialidad,
          anios_experiencia
        });
      }

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          id_usuario: newUser.id_usuario,
          nombre: newUser.nombre,
          apellido: newUser.apellido,
          email: newUser.email
        }
      });

    } catch (error) {
      console.error('❌ Error en register:', error.message);

      res.status(500).json({
        success: false,
        message: 'Error al registrar usuario',
        error: error.message
      });
    }
  },

  // Iniciar sesión
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validaciones
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email y contraseña son requeridos'
        });
      }

      const emailErr = validateEmail(email);
      if (emailErr) return res.status(400).json({ success: false, message: emailErr });

      // Buscar usuario
      const user = await UserModel.findByEmail(email);
      console.log('🔍 Usuario encontrado:', user ? 'Sí' : 'No');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar si el usuario está activo
      console.log('👤 Estado del usuario:', user.estado);
      if (!user.estado) {
        return res.status(403).json({
          success: false,
          message: 'Usuario inactivo. Contacta al administrador'
        });
      }

      // Verificar contraseña
      const isValidPassword = await UserModel.verifyPassword(password, user.password);
      console.log('✅ Contraseña válida:', isValidPassword);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Si es ATLETA, verificar perfil
      if (user.rol_nombre === 'ATLETA') {
        const membershipStatus = await AtletaModel.checkMembershipStatus(user.id_usuario);

        if (membershipStatus.status === 'no_atleta') {
          return res.status(403).json({
            success: false,
            message: 'Perfil de atleta no encontrado. Contacta al administrador.'
          });
        }

        if (!membershipStatus.canLogin) {
          let message = 'No puedes iniciar sesión porque no tienes una membresía activa. Contacta al administrador o asigna una membresía válida.';

          if (membershipStatus.status === 'vencida') {
            message = 'No puedes iniciar sesión porque tu membresía está vencida. Renueva tu membresía para continuar.';
          } else if (membershipStatus.status === 'membresia_inactiva') {
            message = 'No puedes iniciar sesión porque la membresía asignada está inactiva.';
          } else if (membershipStatus.status === 'asignada_sin_vigencia') {
            message = 'No puedes iniciar sesión porque tu membresía no tiene vigencia asignada.';
          } else if (membershipStatus.status === 'sin_membresia') {
            message = 'No puedes iniciar sesión porque no tienes una membresía asignada.';
          }

          return res.status(403).json({
            success: false,
            message,
            membershipExpired: true,
            sessionExpired: true
          });
        }
      }

      // Obtener perfil completo
      const profile = await UserModel.getProfile(user.id_usuario);

      // Generar JWT token
      const token = jwt.sign(
        { 
          id_usuario: user.id_usuario,
          email: user.email,
          rol: user.rol_nombre
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Guardar en sesión
      req.session.user = {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol_nombre
      };

      res.json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            rol: user.rol_nombre,
            profile
          },
          token
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error al iniciar sesión',
        error: error.message
      });
    }
  },

  // Cerrar sesión
  logout: (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Error al cerrar sesión'
        });
      }

      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    });
  },

  // Obtener perfil del usuario actual
  getProfile: async (req, res) => {
    try {
      const profile = await UserModel.getProfile(req.user.id_usuario);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Perfil no encontrado'
        });
      }

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error en getProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener perfil',
        error: error.message
      });
    }
  },

  // Verificar token
  verifyToken: async (req, res) => {
    try {
      const user = await UserModel.findById(req.user.id_usuario);
      
      if (!user || !user.estado) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o usuario inactivo'
        });
      }

      res.json({
        success: true,
        data: {
          user: {
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            rol: user.rol_nombre,
            foto_perfil: user.foto_perfil
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al verificar token',
        error: error.message
      });
    }
  },

  // Obtener membresías disponibles (público)
  getAvailableMemberships: async (req, res) => {
    try {
      const memberships = await MemberModel.getAllMemberships();
      
      // Filtrar solo las activas
      const activeMemberships = memberships.filter(m => m.estado);
      
      res.json({
        success: true,
        data: activeMemberships
      });
    } catch (error) {
      console.error('Error al obtener membresías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener membresías disponibles',
        error: error.message
      });
    }
  },

  // Subir imagen de perfil
  uploadProfileImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ninguna imagen'
        });
      }

      const id_usuario = req.user.id_usuario;
      const imageUrl = `/uploads/profiles/${req.file.filename}`;

      // Actualizar la foto de perfil en la base de datos
      const { query } = require('../../config/database');
      const sql = 'UPDATE usuario SET foto_perfil = $1 WHERE id_usuario = $2 RETURNING foto_perfil';
      const result = await query(sql, [imageUrl, id_usuario]);

      res.json({
        success: true,
        message: 'Imagen de perfil actualizada correctamente',
        data: {
          foto_perfil: result.rows[0].foto_perfil
        }
      });
    } catch (error) {
      console.error('Error al subir imagen de perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error al subir la imagen de perfil',
        error: error.message
      });
    }
  }
};

module.exports = authController;
