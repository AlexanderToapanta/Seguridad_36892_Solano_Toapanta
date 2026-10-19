const { query } = require('../../config/database');

// Modelo para los miembros/membresías usando PostgreSQL
class MemberModel {
  // Obtener todas las membresías desde la base de datos
  static async getAllMemberships() {
    const sql = `
      SELECT * FROM membresia
      ORDER BY precio ASC
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Obtener membresía por ID
  static async getMembershipById(id) {
    const sql = `
      SELECT * FROM membresia
      WHERE id_membresia = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Registrar nuevo miembro en la base de datos
  static async registerMember(memberData) {
    const { name, email, membershipId, phone, address } = memberData;
    
    const sql = `
      INSERT INTO atleta (nombre, email, id_membresia, telefono, direccion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await query(sql, [name, email, membershipId, phone, address]);
    return result.rows[0];
  }

  // Obtener todos los miembros
  static async getAllMembers() {
    const sql = `
      SELECT a.id_atleta, a.id_usuario, a.peso, a.altura, a.fecha_registro, a.id_membresia,
             a.fecha_inicio_membresia as fecha_inicio,
             a.fecha_fin_membresia as fecha_fin,
             u.nombre, u.apellido, u.email, u.telefono, u.estado as activo, 
             m.nombre as membresia_nombre, m.precio, m.duracion_dias
      FROM atleta a
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      LEFT JOIN membresia m ON a.id_membresia = m.id_membresia
      ORDER BY u.id_usuario DESC
    `;
    
    const result = await query(sql);
    return result.rows;
  }
}

module.exports = MemberModel;
