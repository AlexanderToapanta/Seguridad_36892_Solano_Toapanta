const { query } = require('../../config/database');

class EntrenadorModel {
  // Crear perfil de entrenador
  static async create(entrenadorData) {
    const { id_usuario, especialidad, anios_experiencia, certificaciones, biografia } = entrenadorData;
    
    const sql = `
      INSERT INTO entrenador (id_usuario, especialidad, anios_experiencia, certificaciones, biografia)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await query(sql, [
      id_usuario, 
      especialidad || null, 
      anios_experiencia || null,
      certificaciones || null,
      biografia || null
    ]);
    return result.rows[0];
  }

  // Obtener entrenador por ID de usuario
  static async findByUserId(id_usuario) {
    const sql = `
      SELECT e.*, u.nombre, u.apellido, u.email
      FROM entrenador e
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE e.id_usuario = $1
    `;
    
    const result = await query(sql, [id_usuario]);
    return result.rows[0];
  }

  // Obtener todos los entrenadores
  static async findAll() {
    const sql = `
      SELECT e.*, u.nombre, u.apellido, u.email, u.estado
      FROM entrenador e
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      ORDER BY u.nombre
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Actualizar datos del entrenador
  static async update(id_entrenador, data) {
    const { especialidad, anios_experiencia, certificaciones, biografia } = data;
    
    const sql = `
      UPDATE entrenador
      SET especialidad = COALESCE($1, especialidad),
          anios_experiencia = COALESCE($2, anios_experiencia),
          certificaciones = COALESCE($3, certificaciones),
          biografia = COALESCE($4, biografia)
      WHERE id_entrenador = $5
      RETURNING *
    `;
    
    const result = await query(sql, [especialidad, anios_experiencia, certificaciones, biografia, id_entrenador]);
    return result.rows[0];
  }

  // Obtener clases del entrenador
  static async getClases(id_entrenador) {
    const sql = `
      SELECT c.*,
             COUNT(i.id_inscripcion) as inscritos
      FROM clase c
      LEFT JOIN inscripcion i ON c.id_clase = i.id_clase
      WHERE c.id_entrenador = $1
      GROUP BY c.id_clase
      ORDER BY c.fecha DESC, c.hora DESC
    `;
    
    const result = await query(sql, [id_entrenador]);
    return result.rows;
  }
}

module.exports = EntrenadorModel;
