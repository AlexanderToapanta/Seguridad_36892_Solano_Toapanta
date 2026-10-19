const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const AtletaModel = require('../models/AtletaModel');

// Middleware para verificar autenticación
const authMiddleware = async (req, res, next) => {
  try {
    // Obtener token del header o cookies
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Token no proporcionado'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar que el usuario exista y esté activo
    const user = await UserModel.findById(decoded.id_usuario);
    
    if (!user || !user.estado) {
      return res.status(401).json({
        success: false,
        message: 'Usuario inválido o inactivo',
        sessionExpired: true
      });
    }

    // Si es atleta, verificar estado de membresía
    if (user.rol_nombre === 'ATLETA') {
      const membershipStatus = await AtletaModel.checkMembershipStatus(user.id_usuario);
      
      if (!membershipStatus.canLogin) {
        // Desactivar usuario automáticamente
        await UserModel.updateStatus(user.id_usuario, false);

        let message = 'No tienes una membresía activa. Por favor contacta al administrador para renovarla o asignar una nueva.';
        if (membershipStatus.status === 'vencida') {
          message = 'Tu membresía ha vencido. Por favor contacta al administrador para renovarla.';
        } else if (membershipStatus.status === 'sin_membresia') {
          message = 'No tienes una membresía asignada. Por favor contacta al administrador para activarla.';
        } else if (membershipStatus.status === 'membresia_inactiva') {
          message = 'La membresía asignada está inactiva. Por favor contacta al administrador.';
        } else if (membershipStatus.status === 'asignada_sin_vigencia') {
          message = 'Tu membresía no tiene vigencia asignada. Por favor contacta al administrador.';
        }
        
        return res.status(403).json({
          success: false,
          message,
          membershipExpired: true,
          sessionExpired: true
        });
      }
    }

    // Agregar usuario al request
    req.user = {
      id_usuario: user.id_usuario,
      email: user.email,
      rol: user.rol_nombre
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        sessionExpired: true
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para verificar roles específicos
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// Middleware para verificar que sea administrador
const isAdmin = checkRole('ADMINISTRADOR');

// Middleware para verificar que sea entrenador
const isTrainer = checkRole('ENTRENADOR', 'ADMINISTRADOR');

// Middleware para verificar que sea atleta
const isAthlete = checkRole('ATLETA', 'ADMINISTRADOR');

module.exports = {
  authMiddleware,
  verifyToken: authMiddleware, // Alias para compatibilidad
  checkRole,
  isAdmin,
  isTrainer,
  isAthlete
};
