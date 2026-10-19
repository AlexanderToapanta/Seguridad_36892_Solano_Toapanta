const { query } = require('../../config/database');

// Modelo para los entrenadores usando PostgreSQL
class TrainerModel {
  // Obtener todos los entrenadores desde la base de datos
  static async getAllTrainers() {
    const sql = `
      SELECT 
        e.id_entrenador,
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.estado as activo,
        u.foto_perfil,
        e.especialidad,
        e.anios_experiencia,
        e.certificaciones,
        e.biografia
      FROM entrenador e
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      ORDER BY e.anios_experiencia DESC
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Obtener entrenador por ID
  static async getTrainerById(id) {
    const sql = `
      SELECT 
        e.id_entrenador,
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.estado as activo,
        u.foto_perfil,
        e.especialidad,
        e.anios_experiencia,
        e.certificaciones,
        e.biografia
      FROM entrenador e
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE e.id_entrenador = $1
    `;
    
    const result = await query(sql, [id]);
    return result.rows[0];
  }

  // Obtener entrenadores por especialidad
  static async getTrainersBySpecialty(specialty) {
    const sql = `
      SELECT 
        e.id_entrenador,
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        e.especialidad,
        e.anios_experiencia,
        e.certificaciones,
        e.biografia
      FROM entrenador e
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE u.estado = true 
        AND LOWER(e.especialidad) LIKE LOWER($1)
      ORDER BY e.anios_experiencia DESC
    `;
    
    const result = await query(sql, [`%${specialty}%`]);
    return result.rows;
  }

  // Obtener clases de un entrenador
  static async getTrainerClasses(id_entrenador) {
    const sql = `
      SELECT 
        c.id_clase,
        c.nombre,
        c.descripcion,
        c.fecha_hora,
        c.duracion,
        c.capacidad_maxima,
        c.estado
      FROM clase c
      WHERE c.id_entrenador = $1 AND c.estado = 'ACTIVA'
      ORDER BY c.fecha_hora ASC
    `;
    
    const result = await query(sql, [id_entrenador]);
    return result.rows;
  }
}

module.exports = TrainerModel;
