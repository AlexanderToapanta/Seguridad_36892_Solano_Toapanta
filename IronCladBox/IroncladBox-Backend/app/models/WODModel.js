const { query } = require('../../config/database');

class WODModel {
  // Crear WOD
  static async create(wodData) {
    const { fecha, titulo, descripcion, tipo, nivel, id_entrenador } = wodData;
    
    const sql = `
      INSERT INTO wod (fecha, titulo, descripcion, tipo, nivel, id_entrenador)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await query(sql, [fecha, titulo, descripcion, tipo, nivel, id_entrenador]);
    return result.rows[0];
  }

  // Obtener WOD por fecha
  static async findByDate(fecha) {
    const sql = `
      SELECT w.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre
      FROM wod w
      LEFT JOIN entrenador e ON w.id_entrenador = e.id_entrenador
      LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE w.fecha = $1
    `;
    
    const result = await query(sql, [fecha]);
    return result.rows[0];
  }

  // Obtener WOD por ID
  static async findById(id_wod) {
    const sql = `
      SELECT w.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre
      FROM wod w
      LEFT JOIN entrenador e ON w.id_entrenador = e.id_entrenador
      LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE w.id_wod = $1
    `;
    
    const result = await query(sql, [id_wod]);
    return result.rows[0];
  }

  // Obtener WOD con horarios
  static async findByDateWithSchedules(fecha) {
    const wodSql = `
      SELECT w.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre
      FROM wod w
      LEFT JOIN entrenador e ON w.id_entrenador = e.id_entrenador
      LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE w.fecha = $1
    `;
    
    const wodResult = await query(wodSql, [fecha]);
    if (wodResult.rows.length === 0) return null;
    
    const wod = wodResult.rows[0];
    
    // Obtener horarios del WOD
    const schedulesSql = `
      SELECT h.id_horario,
             h.id_wod,
             h.hora,
             h.cupo_maximo,
             h.id_entrenador,
             h.estado,
             h.created_at,
             COALESCE(u.nombre || ' ' || u.apellido, 'Sin asignar') as entrenador_nombre,
             COUNT(i.id_inscripcion)::integer as inscritos,
             (h.cupo_maximo - COUNT(i.id_inscripcion))::integer as cupos_disponibles
      FROM horario_clase h
      LEFT JOIN entrenador e ON h.id_entrenador = e.id_entrenador
      LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN inscripcion i ON h.id_horario = i.id_horario AND i.estado = 'ACTIVA'
      WHERE h.id_wod = $1 AND h.estado = 'ACTIVO'
      GROUP BY h.id_horario, h.id_wod, h.hora, h.cupo_maximo, h.id_entrenador, h.estado, h.created_at, u.nombre, u.apellido
      ORDER BY h.hora
    `;
    
    const schedulesResult = await query(schedulesSql, [wod.id_wod]);
    wod.horarios = schedulesResult.rows;
    
    return wod;
  }

  // Obtener WODs de un mes
  static async findByMonth(year, month) {
    const sql = `
      SELECT w.*,
             u.nombre || ' ' || u.apellido as entrenador_nombre,
             COUNT(DISTINCT h.id_horario) as total_horarios
      FROM wod w
      LEFT JOIN entrenador e ON w.id_entrenador = e.id_entrenador
      LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN horario_clase h ON w.id_wod = h.id_wod AND h.estado = 'ACTIVO'
      WHERE EXTRACT(YEAR FROM w.fecha) = $1 
        AND EXTRACT(MONTH FROM w.fecha) = $2
      GROUP BY w.id_wod, u.nombre, u.apellido
      ORDER BY w.fecha
    `;
    
    const result = await query(sql, [year, month]);
    return result.rows;
  }

  // Actualizar WOD
  static async update(id_wod, wodData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (wodData.titulo !== undefined) {
      fields.push(`titulo = $${paramIndex++}`);
      values.push(wodData.titulo);
    }
    if (wodData.descripcion !== undefined) {
      fields.push(`descripcion = $${paramIndex++}`);
      values.push(wodData.descripcion);
    }
    if (wodData.tipo !== undefined) {
      fields.push(`tipo = $${paramIndex++}`);
      values.push(wodData.tipo);
    }
    if (wodData.nivel !== undefined) {
      fields.push(`nivel = $${paramIndex++}`);
      values.push(wodData.nivel);
    }
    if (wodData.id_entrenador !== undefined) {
      fields.push(`id_entrenador = $${paramIndex++}`);
      values.push(wodData.id_entrenador);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    values.push(id_wod);
    const sql = `
      UPDATE wod 
      SET ${fields.join(', ')}
      WHERE id_wod = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  // Eliminar WOD
  static async delete(id_wod) {
    const sql = 'DELETE FROM wod WHERE id_wod = $1';
    await query(sql, [id_wod]);
  }

  // Verificar si existe WOD para una fecha
  static async existsForDate(fecha) {
    const sql = 'SELECT EXISTS(SELECT 1 FROM wod WHERE fecha = $1) as exists';
    const result = await query(sql, [fecha]);
    return result.rows[0].exists;
  }
}

// Modelo para horarios de clase
class HorarioClaseModel {
  // Crear horario
  static async create(horarioData) {
    const { id_wod, hora, cupo_maximo, id_entrenador } = horarioData;
    
    const sql = `
      INSERT INTO horario_clase (id_wod, hora, cupo_maximo, id_entrenador)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await query(sql, [id_wod, hora, cupo_maximo, id_entrenador]);
    return result.rows[0];
  }

  // Crear múltiples horarios para un WOD
  static async createMultiple(id_wod, horarios) {
    const results = [];
    for (const horario of horarios) {
      const result = await this.create({
        id_wod,
        hora: horario.hora,
        cupo_maximo: horario.cupo_maximo,
        id_entrenador: horario.id_entrenador
      });
      results.push(result);
    }
    return results;
  }

  // Obtener horario por ID con información completa
  static async findById(id_horario) {
    const sql = `
      SELECT h.*,
             w.fecha, w.titulo as wod_titulo, w.descripcion as wod_descripcion,
             u.nombre || ' ' || u.apellido as entrenador_nombre,
             COUNT(i.id_inscripcion) as inscritos,
             (h.cupo_maximo - COUNT(i.id_inscripcion)) as cupos_disponibles
      FROM horario_clase h
      INNER JOIN wod w ON h.id_wod = w.id_wod
      LEFT JOIN entrenador e ON h.id_entrenador = e.id_entrenador
      LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN inscripcion i ON h.id_horario = i.id_horario AND i.estado = 'ACTIVA'
      WHERE h.id_horario = $1
      GROUP BY h.id_horario, w.id_wod, u.nombre, u.apellido
    `;
    
    const result = await query(sql, [id_horario]);
    return result.rows[0];
  }

  // Obtener horarios de un WOD
  static async findByWOD(id_wod) {
    const sql = `
      SELECT h.id_horario,
             h.id_wod,
             h.hora,
             h.cupo_maximo,
             h.id_entrenador,
             h.estado,
             h.created_at,
             COALESCE(u.nombre || ' ' || u.apellido, 'Sin asignar') as entrenador_nombre,
             COUNT(i.id_inscripcion)::integer as inscritos,
             (h.cupo_maximo - COUNT(i.id_inscripcion))::integer as cupos_disponibles
      FROM horario_clase h
      LEFT JOIN entrenador e ON h.id_entrenador = e.id_entrenador
      LEFT JOIN usuario u ON e.id_usuario = u.id_usuario
      LEFT JOIN inscripcion i ON h.id_horario = i.id_horario AND i.estado = 'ACTIVA'
      WHERE h.id_wod = $1 AND h.estado = 'ACTIVO'
      GROUP BY h.id_horario, h.id_wod, h.hora, h.cupo_maximo, h.id_entrenador, h.estado, h.created_at, u.nombre, u.apellido
      ORDER BY h.hora
    `;
    
    const result = await query(sql, [id_wod]);
    return result.rows;
  }

  // Verificar si un atleta ya está inscrito en algún horario del día
  static async checkAthleteEnrolledToday(id_atleta, fecha) {
    const sql = `
      SELECT h.*, w.fecha, w.titulo
      FROM inscripcion i
      INNER JOIN horario_clase h ON i.id_horario = h.id_horario
      INNER JOIN wod w ON h.id_wod = w.id_wod
      WHERE i.id_atleta = $1 
        AND w.fecha = $2 
        AND i.estado = 'ACTIVA'
    `;
    
    const result = await query(sql, [id_atleta, fecha]);
    return result.rows[0];
  }

  // Actualizar horario
  static async update(id_horario, horarioData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (horarioData.hora !== undefined) {
      fields.push(`hora = $${paramIndex++}`);
      values.push(horarioData.hora);
    }
    if (horarioData.cupo_maximo !== undefined) {
      fields.push(`cupo_maximo = $${paramIndex++}`);
      values.push(horarioData.cupo_maximo);
    }
    if (horarioData.estado !== undefined) {
      fields.push(`estado = $${paramIndex++}`);
      values.push(horarioData.estado);
    }

    if (fields.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    values.push(id_horario);
    const sql = `
      UPDATE horario_clase 
      SET ${fields.join(', ')}
      WHERE id_horario = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  // Cancelar horario
  static async cancel(id_horario) {
    return await this.update(id_horario, { estado: 'CANCELADO' });
  }

  // Eliminar horario
  static async delete(id_horario) {
    const sql = 'DELETE FROM horario_clase WHERE id_horario = $1';
    await query(sql, [id_horario]);
  }
}

module.exports = { WODModel, HorarioClaseModel };
