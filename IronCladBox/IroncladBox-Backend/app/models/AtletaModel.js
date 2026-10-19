const { query } = require('../../config/database');

class AtletaModel {
  // Crear perfil de atleta
  static async create(atletaData) {
    const { id_usuario, peso, altura } = atletaData;
    
    const sql = `
      INSERT INTO atleta (id_usuario, peso, altura)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await query(sql, [id_usuario, peso || null, altura || null]);
    return result.rows[0];
  }

  // Obtener atleta por ID de usuario
  static async findByUserId(id_usuario) {
    const sql = `
      SELECT a.*, u.nombre, u.apellido, u.email, u.telefono, u.estado
      FROM atleta a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      WHERE a.id_usuario = $1
    `;
    
    const result = await query(sql, [id_usuario]);
    return result.rows[0];
  }

  // Obtener atleta por ID de atleta
  static async findById(id_atleta) {
    const sql = `
      SELECT a.*, u.nombre, u.apellido, u.email, u.telefono, u.estado
      FROM atleta a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      WHERE a.id_atleta = $1
    `;
    
    const result = await query(sql, [id_atleta]);
    return result.rows[0];
  }

  // Obtener todos los atletas
  static async findAll() {
    const sql = `
      SELECT a.*, u.nombre, u.apellido, u.email, u.estado
      FROM atleta a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      ORDER BY a.fecha_registro DESC
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Actualizar datos del atleta
  static async update(id_atleta, data) {
    const { peso, altura } = data;
    
    const sql = `
      UPDATE atleta
      SET peso = COALESCE($1, peso),
          altura = COALESCE($2, altura)
      WHERE id_atleta = $3
      RETURNING *
    `;
    
    const result = await query(sql, [peso, altura, id_atleta]);
    return result.rows[0];
  }

  // Obtener inscripciones del atleta
  static async getInscripciones(id_atleta) {
    const sql = `
      SELECT i.*, 
             c.nombre as clase_nombre,
             c.descripcion,
             c.fecha,
             c.hora,
             c.cupo_maximo,
             u.nombre || ' ' || u.apellido as entrenador_nombre
      FROM inscripcion i
      INNER JOIN clase c ON i.id_clase = c.id_clase
      INNER JOIN entrenador e ON c.id_entrenador = e.id_entrenador
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE i.id_atleta = $1
      ORDER BY c.fecha DESC, c.hora DESC
    `;
    
    const result = await query(sql, [id_atleta]);
    return result.rows;
  }

  // Verificar estado de membresía de un atleta
  static async checkMembershipStatus(id_usuario) {
    const sql = `
        SELECT a.id_atleta, a.id_membresia, a.fecha_inicio_membresia, a.fecha_fin_membresia,
          m.nombre as membresia_nombre,
          m.estado as membresia_activa,
          m.duracion_dias,
          u.estado as usuario_activo
      FROM atleta a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
        LEFT JOIN membresia m ON a.id_membresia = m.id_membresia
      WHERE a.id_usuario = $1
    `;
    
    const result = await query(sql, [id_usuario]);
    const atleta = result.rows[0];
    
    if (!atleta) {
      return {
        status: 'no_atleta',
        canLogin: false,
        isExpired: false,
        hasMembresia: false,
        hasActiveMembership: false
      };
    }

    if (!atleta.id_membresia) {
      return {
        status: 'sin_membresia',
        canLogin: false,
        isExpired: false,
        hasMembresia: false,
        hasActiveMembership: false,
        id_membresia: null,
        membresia_nombre: null,
        fecha_inicio_membresia: null,
        fecha_fin_membresia: null
      };
    }

    if (!atleta.membresia_activa) {
      return {
        status: 'membresia_inactiva',
        canLogin: false,
        isExpired: false,
        hasMembresia: true,
        hasActiveMembership: false,
        id_membresia: atleta.id_membresia,
        membresia_nombre: atleta.membresia_nombre,
        fecha_inicio_membresia: atleta.fecha_inicio_membresia,
        fecha_fin_membresia: atleta.fecha_fin_membresia
      };
    }

    if (!atleta.fecha_inicio_membresia || !atleta.fecha_fin_membresia) {
      return {
        status: 'asignada_sin_vigencia',
        canLogin: false,
        isExpired: false,
        hasMembresia: true,
        hasActiveMembership: false,
        id_membresia: atleta.id_membresia,
        membresia_nombre: atleta.membresia_nombre,
        fecha_inicio_membresia: atleta.fecha_inicio_membresia,
        fecha_fin_membresia: atleta.fecha_fin_membresia
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fechaFin = new Date(atleta.fecha_fin_membresia);
    fechaFin.setHours(0, 0, 0, 0);
    const isExpired = fechaFin < today;

    if (isExpired) {
      return {
        status: 'vencida',
        canLogin: false,
        isExpired: true,
        hasMembresia: true,
        hasActiveMembership: false,
        id_membresia: atleta.id_membresia,
        membresia_nombre: atleta.membresia_nombre,
        fecha_inicio_membresia: atleta.fecha_inicio_membresia,
        fecha_fin_membresia: atleta.fecha_fin_membresia
      };
    }

    return {
      status: 'activa',
      canLogin: true,
      isExpired: false,
      hasMembresia: true,
      hasActiveMembership: true,
      fecha_fin_membresia: atleta.fecha_fin_membresia,
      fecha_inicio_membresia: atleta.fecha_inicio_membresia,
      id_membresia: atleta.id_membresia,
      membresia_nombre: atleta.membresia_nombre
    };
  }

  // Obtener todos los atletas con membresías vencidas
  static async getExpiredMemberships() {
    const sql = `
      SELECT a.id_atleta, a.id_usuario, a.fecha_fin_membresia,
             u.nombre, u.apellido, u.email, u.estado
      FROM atleta a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      WHERE a.fecha_fin_membresia < CURRENT_DATE
        AND u.estado = true
      ORDER BY a.fecha_fin_membresia ASC
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Desactivar usuarios con membresías vencidas
  static async deactivateExpiredMemberships() {
    const sql = `
      UPDATE usuario
      SET estado = false
      WHERE id_usuario IN (
        SELECT a.id_usuario
        FROM atleta a
        WHERE a.fecha_fin_membresia < CURRENT_DATE
          AND EXISTS (SELECT 1 FROM usuario u WHERE u.id_usuario = a.id_usuario AND u.estado = true)
      )
      RETURNING id_usuario
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Actualizar membresía de un atleta
  static async updateMembership(id_atleta, id_membresia, fecha_inicio, fecha_fin) {
    const sql = `
      UPDATE atleta
      SET id_membresia = $1,
          fecha_inicio_membresia = $2,
          fecha_fin_membresia = $3
      WHERE id_atleta = $4
      RETURNING *
    `;
    
    const result = await query(sql, [id_membresia, fecha_inicio, fecha_fin, id_atleta]);
    return result.rows[0];
  }

  static async cancelMembership(id_atleta) {
    const sql = `
      UPDATE atleta
      SET id_membresia = NULL,
          fecha_inicio_membresia = NULL,
          fecha_fin_membresia = NULL
      WHERE id_atleta = $1
      RETURNING *
    `;

    const result = await query(sql, [id_atleta]);
    return result.rows[0];
  }

  static async getMembershipByUserId(id_usuario) {
    const sql = `
      SELECT a.id_atleta, a.id_membresia, a.fecha_inicio_membresia, a.fecha_fin_membresia,
             m.nombre as membresia_nombre, m.descripcion, m.precio, m.duracion_dias,
             m.estado as membresia_activa,
             u.nombre, u.apellido, u.email
      FROM atleta a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      LEFT JOIN membresia m ON a.id_membresia = m.id_membresia
      WHERE a.id_usuario = $1
    `;

    const result = await query(sql, [id_usuario]);
    if (result.rows.length === 0) {
      return null;
    }

    const membershipStatus = await this.checkMembershipStatus(id_usuario);
    return {
      ...result.rows[0],
      ...membershipStatus
    };
  }
}

module.exports = AtletaModel;
