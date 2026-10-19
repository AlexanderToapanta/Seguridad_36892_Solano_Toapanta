const { query } = require('../../config/database');

const RachaModel = {
  // Obtener racha del atleta
  getRachaByAtleta: async (id_atleta) => {
    try {
      const sql = `
        SELECT * FROM racha_atleta 
        WHERE id_atleta = $1
      `;
      const result = await query(sql, [id_atleta]);
      
      if (result.rows.length === 0) {
        // Si no existe, crear registro inicial
        const insertSql = `
          INSERT INTO racha_atleta (id_atleta, racha_actual, racha_maxima)
          VALUES ($1, 0, 0)
          RETURNING *
        `;
        const insertResult = await query(insertSql, [id_atleta]);
        return insertResult.rows[0];
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al obtener racha:', error);
      throw error;
    }
  },

  // Registrar asistencia y actualizar racha
  registrarAsistencia: async (id_atleta, fecha_asistencia = new Date()) => {
    try {
      const fecha = fecha_asistencia instanceof Date 
        ? fecha_asistencia.toISOString().split('T')[0]
        : fecha_asistencia.split('T')[0];
      
      const sql = `
        SELECT * FROM actualizar_racha_atleta($1, $2)
      `;
      const result = await query(sql, [id_atleta, fecha]);
      return result.rows[0];
    } catch (error) {
      console.error('Error al registrar asistencia:', error);
      throw error;
    }
  },

  // Marcar inscripción como asistida
  marcarAsistencia: async (id_inscripcion, id_atleta, asistio = true) => {
    try {
      const fecha_asistencia = new Date();
      
      // Actualizar inscripción
      const updateSql = `
        UPDATE inscripcion 
        SET asistio = $1, fecha_asistencia = $2
        WHERE id_inscripcion = $3
        RETURNING *
      `;
      const updateResult = await query(updateSql, [asistio, fecha_asistencia, id_inscripcion]);
      
      if (asistio && updateResult.rows.length > 0) {
        // Actualizar racha
        await RachaModel.registrarAsistencia(id_atleta, fecha_asistencia);
      }
      
      return updateResult.rows[0];
    } catch (error) {
      console.error('Error al marcar asistencia:', error);
      throw error;
    }
  },

  // Obtener historial de asistencias
  getHistorialAsistencias: async (id_atleta, limite = 30) => {
    try {
      const sql = `
        SELECT 
          i.id_inscripcion,
          i.fecha_asistencia,
          w.fecha as fecha_wod,
          w.titulo,
          w.tipo,
          h.hora
        FROM inscripcion i
        INNER JOIN horario_clase h ON i.id_horario = h.id_horario
        INNER JOIN wod w ON h.id_wod = w.id_wod
        WHERE i.id_atleta = $1 AND i.asistio = TRUE
        ORDER BY i.fecha_asistencia DESC
        LIMIT $2
      `;
      const result = await query(sql, [id_atleta, limite]);
      return result.rows;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  },

  // Verificar si ya asistió hoy
  yaAsistioHoy: async (id_atleta) => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const sql = `
        SELECT COUNT(*) as count
        FROM inscripcion i
        INNER JOIN horario_clase h ON i.id_horario = h.id_horario
        INNER JOIN wod w ON h.id_wod = w.id_wod
        WHERE i.id_atleta = $1 
        AND i.asistio = TRUE 
        AND w.fecha = $2
      `;
      const result = await query(sql, [id_atleta, hoy]);
      return result.rows[0].count > 0;
    } catch (error) {
      console.error('Error al verificar asistencia de hoy:', error);
      throw error;
    }
  },

  // Obtener estadísticas de racha
  getEstadisticasRacha: async (id_atleta) => {
    try {
      const racha = await RachaModel.getRachaByAtleta(id_atleta);
      
      // Calcular total de asistencias
      const totalSql = `
        SELECT COUNT(*) as total_asistencias
        FROM inscripcion
        WHERE id_atleta = $1 AND asistio = TRUE
      `;
      const totalResult = await query(totalSql, [id_atleta]);
      
      // Obtener asistencias del mes actual
      const mesSql = `
        SELECT COUNT(*) as asistencias_mes
        FROM inscripcion i
        INNER JOIN horario_clase h ON i.id_horario = h.id_horario
        INNER JOIN wod w ON h.id_wod = w.id_wod
        WHERE i.id_atleta = $1 
        AND i.asistio = TRUE 
        AND EXTRACT(MONTH FROM w.fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM w.fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
      `;
      const mesResult = await query(mesSql, [id_atleta]);
      
      return {
        racha_actual: racha.racha_actual || 0,
        racha_maxima: racha.racha_maxima || 0,
        ultima_asistencia: racha.ultima_asistencia,
        fecha_inicio_racha: racha.fecha_inicio_racha,
        total_asistencias: parseInt(totalResult.rows[0].total_asistencias) || 0,
        asistencias_mes: parseInt(mesResult.rows[0].asistencias_mes) || 0
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
};

module.exports = RachaModel;
