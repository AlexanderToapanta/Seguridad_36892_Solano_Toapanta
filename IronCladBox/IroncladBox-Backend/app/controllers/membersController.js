const MemberModel = require('../models/MemberModel');
const AtletaModel = require('../models/AtletaModel');
const UserModel = require('../models/UserModel');

// Controlador para membresías y miembros
const membersController = {
  // Obtener todas las membresías
  getAllMemberships: async (req, res) => {
    try {
      const memberships = await MemberModel.getAllMemberships();
      res.json({
        success: true,
        data: memberships
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener las membresías',
        error: error.message
      });
    }
  },

  // Obtener membresía por ID
  getMembershipById: async (req, res) => {
    try {
      const { id } = req.params;
      const membership = await MemberModel.getMembershipById(id);
      
      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Membresía no encontrada'
        });
      }

      res.json({
        success: true,
        data: membership
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener la membresía',
        error: error.message
      });
    }
  },

  // Registrar nuevo miembro
  registerMember: async (req, res) => {
    try {
      const memberData = req.body;
      
      // Validación básica
      if (!memberData.name || !memberData.email || !memberData.membershipId) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos: name, email, membershipId'
        });
      }

      const newMember = await MemberModel.registerMember(memberData);
      
      res.status(201).json({
        success: true,
        message: 'Registro exitoso',
        data: newMember
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al registrar el miembro',
        error: error.message
      });
    }
  },

  // Obtener todos los miembros (requeriría autenticación en producción)
  getAllMembers: async (req, res) => {
    try {
      const members = await MemberModel.getAllMembers();
      res.json({
        success: true,
        data: members
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los miembros',
        error: error.message
      });
    }
  },

  // Verificar estado de membresía del usuario actual
  checkMembershipStatus: async (req, res) => {
    try {
      const id_usuario = req.user.id_usuario;

      const membership = await AtletaModel.getMembershipByUserId(id_usuario);

      if (!membership) {
        return res.json({
          success: true,
          data: { estado_membresia: 'no_atleta' }
        });
      }

      const fechaFin = membership.fecha_fin_membresia ? new Date(membership.fecha_fin_membresia) : null;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let diasRestantes = null;
      if (fechaFin) {
        fechaFin.setHours(0, 0, 0, 0);
        diasRestantes = Math.ceil((fechaFin.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      let estado_membresia = membership.status || 'sin_membresia';
      if (membership.status === 'activa' && diasRestantes !== null && diasRestantes <= 7) {
        estado_membresia = 'por_vencer';
      }

      res.json({
        success: true,
        data: {
          ...membership,
          estado_membresia,
          dias_restantes: diasRestantes
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al verificar estado de membresía',
        error: error.message
      });
    }
  },

  getMyMembership: async (req, res) => {
    try {
      const membership = await AtletaModel.getMembershipByUserId(req.user.id_usuario);

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de atleta no encontrado'
        });
      }

      res.json({
        success: true,
        data: membership
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener la membresía del atleta',
        error: error.message
      });
    }
  },

  updateMyMembership: async (req, res) => {
    try {
      const { id_membresia } = req.body;

      if (!id_membresia) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere id_membresia'
        });
      }

      const atleta = await AtletaModel.findByUserId(req.user.id_usuario);
      if (!atleta) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de atleta no encontrado'
        });
      }

      const membership = await MemberModel.getMembershipById(id_membresia);
      if (!membership || !membership.estado) {
        return res.status(404).json({
          success: false,
          message: 'La membresía seleccionada no está disponible'
        });
      }

      const fechaInicio = new Date();
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + membership.duracion_dias);

      const updated = await AtletaModel.updateMembership(
        atleta.id_atleta,
        id_membresia,
        fechaInicio.toISOString().split('T')[0],
        fechaFin.toISOString().split('T')[0]
      );

      await UserModel.updateStatus(req.user.id_usuario, true);

      res.json({
        success: true,
        message: 'Membresía actualizada correctamente',
        data: updated
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la membresía',
        error: error.message
      });
    }
  },

  cancelMyMembership: async (req, res) => {
    try {
      const atleta = await AtletaModel.findByUserId(req.user.id_usuario);

      if (!atleta) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de atleta no encontrado'
        });
      }

      if (!atleta.id_membresia) {
        return res.status(400).json({
          success: false,
          message: 'No tienes una membresía asignada para cancelar'
        });
      }

      const membershipStatus = await AtletaModel.checkMembershipStatus(req.user.id_usuario);
      if (membershipStatus.status !== 'activa') {
        return res.status(400).json({
          success: false,
          message: 'Tu membresía ya no está activa'
        });
      }

      const updated = await AtletaModel.cancelMembership(atleta.id_atleta);

      res.json({
        success: true,
        message: 'Membresía cancelada correctamente',
        data: updated
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al cancelar la membresía',
        error: error.message
      });
    }
  }
};

module.exports = membersController;
