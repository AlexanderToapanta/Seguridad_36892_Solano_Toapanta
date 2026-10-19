const { query } = require('../../config/database');

class InscripcionModel {
  // Crear inscripción o reactivar una cancelada
  static async create(inscripcionData) {
    const { id_atleta, id_clase, id_horario } = inscripcionData;
    
    // Si se proporciona id_horario, crear inscripción para horario
    if (id_horario) {
      return await this.createForSchedule(inscripcionData);
    }
    
    // Verificar que haya cupo disponible
    const cupoSql = `
      SELECT c.cupo_maximo, COUNT(i.id_inscripcion) as inscritos
      FROM clase c
      LEFT JOIN inscripcion i ON c.id_clase = i.id_clase AND i.estado = 'ACTIVA'
      WHERE c.id_clase = $1
      GROUP BY c.cupo_maximo
    `;
    
    const cupoResult = await query(cupoSql, [id_clase]);
    if (cupoResult.rows.length === 0) {
      throw new Error('Clase no encontrada');
    }
    
    const { cupo_maximo, inscritos } = cupoResult.rows[0];
    if (parseInt(inscritos) >= cupo_maximo) {
      throw new Error('No hay cupos disponibles');
    }
    
    // Verificar si existe una inscripción previa (activa o cancelada)
    const existingInscripcion = await query(
      'SELECT * FROM inscripcion WHERE id_atleta = $1 AND id_clase = $2',
      [id_atleta, id_clase]
    );
    
    // Si existe, reactivarla
    if (existingInscripcion.rows.length > 0) {
      const updateSql = `
        UPDATE inscripcion 
        SET estado = 'ACTIVA', fecha_inscripcion = CURRENT_DATE
        WHERE id_atleta = $1 AND id_clase = $2
        RETURNING *
      `;
      const result = await query(updateSql, [id_atleta, id_clase]);
      return result.rows[0];
    }
    
    // Si no existe, crear nueva inscripción
    const sql = `
      INSERT INTO inscripcion (id_atleta, id_clase)
      VALUES ($1, $2)
      RETURNING *
    `;
    
    const result = await query(sql, [id_atleta, id_clase]);
    return result.rows[0];
  }

  // Cancelar inscripción
  static async cancel(id_inscripcion) {
    const sql = `
      UPDATE inscripcion
      SET estado = 'CANCELADA'
      WHERE id_inscripcion = $1
      RETURNING *
    `;
    
    const result = await query(sql, [id_inscripcion]);
    return result.rows[0];
  }

  // Eliminar inscripción permanentemente
  static async delete(id_inscripcion) {
    const sql = `
      DELETE FROM inscripcion
      WHERE id_inscripcion = $1
      RETURNING *
    `;
    
    const result = await query(sql, [id_inscripcion]);
    return result.rows[0];
  }

  // Obtener inscripciones de un atleta
  static async findByAtleta(id_atleta) {
    const sql = `
      SELECT i.id_inscripcion,
             i.id_atleta,
             i.id_clase,
             i.estado as inscripcion_estado,
             c.nombre,
             c.descripcion,
             c.fecha,
             c.hora,
             c.estado as clase_estado,
             u.nombre || ' ' || u.apellido as entrenador_nombre,
             CASE 
               WHEN c.fecha < CURRENT_DATE THEN true
               WHEN c.fecha = CURRENT_DATE AND c.hora < CURRENT_TIME THEN true
               ELSE false
             END as clase_completada,
             CASE 
               WHEN c.fecha < CURRENT_DATE - INTERVAL '7 days' THEN true
               ELSE false
             END as clase_vencida
      FROM inscripcion i
      INNER JOIN clase c ON i.id_clase = c.id_clase
      INNER JOIN entrenador e ON c.id_entrenador = e.id_entrenador
      INNER JOIN usuario u ON e.id_usuario = u.id_usuario
      WHERE i.id_atleta = $1 AND i.estado = 'ACTIVA'
      ORDER BY c.fecha DESC, c.hora DESC
    `;
    
    const result = await query(sql, [id_atleta]);
    return result.rows;
  }

  // Obtener atletas inscritos en una clase
  static async findByClase(id_clase) {
    const sql = `
      SELECT i.*,
             u.nombre || ' ' || u.apellido as atleta_nombre,
             u.email,
             a.peso,
             a.altura
      FROM inscripcion i
      INNER JOIN atleta a ON i.id_atleta = a.id_atleta
      INNER JOIN usuario u ON a.id_usuario = u.id_usuario
      WHERE i.id_clase = $1 AND i.estado = 'ACTIVA'
      ORDER BY i.fecha_inscripcion
    `;
    
    const result = await query(sql, [id_clase]);
    return result.rows;
  }

  // Crear inscripción para horario (WOD)
  static async createForSchedule(inscripcionData) {
    const { id_atleta, id_horario, fecha_inscripcion } = inscripcionData;
    
    console.log('📝 Creando inscripción para horario:', { id_atleta, id_horario, fecha_inscripcion });
    
    // Verificar que haya cupo disponible
    const cupoSql = `
      SELECT h.cupo_maximo, COUNT(i.id_inscripcion)::integer as inscritos
      FROM horario_clase h
      LEFT JOIN inscripcion i ON h.id_horario = i.id_horario AND i.estado = 'ACTIVA'
      WHERE h.id_horario = $1
      GROUP BY h.cupo_maximo
    `;
    
    const cupoResult = await query(cupoSql, [id_horario]);
    if (cupoResult.rows.length === 0) {
      throw new Error('Horario no encontrado');
    }
    
    const { cupo_maximo, inscritos } = cupoResult.rows[0];
    console.log('📊 Verificación de cupo:', { cupo_maximo, inscritos });
    
    if (parseInt(inscritos) >= cupo_maximo) {
      throw new Error('No hay cupos disponibles');
    }
    
    // Verificar si existe una inscripción previa (activa o cancelada)
    const existingInscripcion = await query(
      'SELECT * FROM inscripcion WHERE id_atleta = $1 AND id_horario = $2',
      [id_atleta, id_horario]
    );
    
    console.log('🔍 Inscripción existente:', existingInscripcion.rows.length > 0 ? 'SÍ' : 'NO');
    
    // Si existe, reactivarla
    if (existingInscripcion.rows.length > 0) {
      const updateSql = `
        UPDATE inscripcion 
        SET estado = 'ACTIVA', fecha_inscripcion = $1
        WHERE id_atleta = $2 AND id_horario = $3
        RETURNING *
      `;
      const result = await query(updateSql, [fecha_inscripcion || new Date(), id_atleta, id_horario]);
      console.log('✅ Inscripción reactivada:', result.rows[0]);
      return result.rows[0];
    }
    
    // Si no existe, crear nueva inscripción
    const sql = `
      INSERT INTO inscripcion (id_atleta, id_horario, fecha_inscripcion, estado)
      VALUES ($1, $2, $3, 'ACTIVA')
      RETURNING *
    `;
    
    const result = await query(sql, [id_atleta, id_horario, fecha_inscripcion || new Date()]);
    console.log('✅ Nueva inscripción creada:', result.rows[0]);
    return result.rows[0];
  }
}

module.exports = InscripcionModel;
