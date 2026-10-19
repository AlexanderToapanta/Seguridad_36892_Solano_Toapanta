const { query } = require('../../config/database');

class ClaseModel {
  // Crear clase
  static async create(claseData) {
    const { nombre, descripcion, fecha, hora, cupo_maximo, id_entrenador } = claseData;
    
    const sql = `
      INSERT INTO clase (nombre, descripcion, fecha, hora, cupo_maximo, id_entrenador)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await query(sql, [nombre, descripcion, fecha, hora, cupo_maximo, id_entrenador]);
    return result.rows[0];
  }

  // Obtener todas las clases
  static async findAll() {
    const sql = `
      SELECT c.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre,
             e.especialidad,
             COUNT(i.id_inscripcion) as inscritos
      FROM clase c
      INNER JOIN entrenador e ON c.id_entrenador = e.id_entrenador
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN inscripcion i ON c.id_clase = i.id_clase AND i.estado = 'ACTIVA'
      GROUP BY c.id_clase, u.nombre, u.apellido, e.especialidad
      ORDER BY c.fecha DESC, c.hora DESC
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Obtener clase por ID
  static async findById(id_clase) {
    const sql = `
      SELECT c.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre,
             e.especialidad,
             COUNT(i.id_inscripcion) as inscritos
      FROM clase c
      INNER JOIN entrenador e ON c.id_entrenador = e.id_entrenador
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN inscripcion i ON c.id_clase = i.id_clase AND i.estado = 'ACTIVA'
      WHERE c.id_clase = $1
      GROUP BY c.id_clase, u.nombre, u.apellido, e.especialidad
    `;
    
    const result = await query(sql, [id_clase]);
    return result.rows[0];
  }

  // Obtener clases disponibles (con cupo)
  static async findAvailable() {
    const sql = `
      SELECT c.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre,
             e.especialidad,
             COUNT(i.id_inscripcion) as inscritos,
             (c.cupo_maximo - COUNT(i.id_inscripcion)) as cupos_disponibles
      FROM clase c
      INNER JOIN entrenador e ON c.id_entrenador = e.id_entrenador
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN inscripcion i ON c.id_clase = i.id_clase AND i.estado = 'ACTIVA'
      WHERE c.fecha >= CURRENT_DATE
      GROUP BY c.id_clase, u.nombre, u.apellido, e.especialidad
      HAVING COUNT(i.id_inscripcion) < c.cupo_maximo
      ORDER BY c.fecha, c.hora
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Actualizar clase
  static async update(id_clase, data) {
    // Construir dinámicamente la consulta UPDATE solo con los campos proporcionados
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      fields.push(`descripcion = $${paramIndex++}`);
      values.push(data.descripcion);
    }
    if (data.fecha !== undefined) {
      fields.push(`fecha = $${paramIndex++}`);
      values.push(data.fecha);
    }
    if (data.hora !== undefined) {
      fields.push(`hora = $${paramIndex++}`);
      values.push(data.hora);
    }
    if (data.cupo_maximo !== undefined) {
      fields.push(`cupo_maximo = $${paramIndex++}`);
      values.push(data.cupo_maximo);
    }
    if (data.id_entrenador !== undefined) {
      fields.push(`id_entrenador = $${paramIndex++}`);
      values.push(data.id_entrenador);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    values.push(id_clase);
    
    const sql = `
      UPDATE clase
      SET ${fields.join(', ')}
      WHERE id_clase = $${paramIndex}
      RETURNING *
    `;
    
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Eliminar clase
  static async delete(id_clase) {
    const sql = 'DELETE FROM clase WHERE id_clase = $1';
    await query(sql, [id_clase]);
  }

  // Obtener clases por entrenador
  static async findByTrainer(id_entrenador) {
    const sql = `
      SELECT c.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre,
             e.especialidad,
             COUNT(i.id_inscripcion) as inscritos
      FROM clase c
      INNER JOIN entrenador e ON c.id_entrenador = e.id_entrenador
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN inscripcion i ON c.id_clase = i.id_clase AND i.estado = 'ACTIVA'
      WHERE c.id_entrenador = $1
      GROUP BY c.id_clase, u.nombre, u.apellido, e.especialidad
      ORDER BY c.fecha DESC, c.hora DESC
    `;
    
    const result = await query(sql, [id_entrenador]);
    return result.rows;
  }

  // Verificar si hay choque de horarios para un entrenador
  static async checkScheduleConflict(id_entrenador, fecha, hora, id_clase_excluir = null) {
    let sql = `
      SELECT c.*, 
             EXTRACT(EPOCH FROM (c.hora - $3::TIME)) / 60 as diff_minutes
      FROM clase c
      WHERE c.id_entrenador = $1
        AND c.fecha = $2
        AND c.estado = 'ACTIVA'
    `;
    
    const params = [id_entrenador, fecha, hora];
    
    // Si estamos actualizando, excluir la clase actual
    if (id_clase_excluir) {
      sql += ` AND c.id_clase != $4`;
      params.push(id_clase_excluir);
    }
    
    const result = await query(sql, params);
    
    // Filtrar manualmente las clases que están a menos de 60 minutos de distancia
    const conflicts = result.rows.filter(row => {
      const diffMinutes = Math.abs(row.diff_minutes);
      return diffMinutes < 60; // Si la diferencia es menor a 60 minutos, hay conflicto
    });
    
    return conflicts.length > 0 ? conflicts[0] : null;
  }

  // Eliminar clases vencidas (más de 7 días después de su fecha)
  static async deleteExpiredClasses() {
    const sql = `
      DELETE FROM clase 
      WHERE fecha < CURRENT_DATE - INTERVAL '7 days'
      AND estado = 'ACTIVA'
      RETURNING *
    `;
    
    const result = await query(sql);
    return result.rows;
  }
}

module.exports = ClaseModel;
