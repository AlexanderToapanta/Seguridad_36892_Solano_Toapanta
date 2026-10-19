const { pool } = require('../../config/database');

class ProgresoModel {
    // Obtener todas las marcas de un atleta
    static async getByAtleta(idAtleta) {
        const query = `
            SELECT 
                p.id_progreso,
                p.id_atleta,
                p.id_ejercicio,
                p.marca_maxima,
                p.fecha_registro,
                p.fecha_actualizacion,
                e.nombre as nombre_ejercicio,
                e.descripcion,
                e.imagen_url
            FROM progreso_atleta p
            INNER JOIN ejercicio e ON p.id_ejercicio = e.id_ejercicio
            WHERE p.id_atleta = $1 AND e.activo = true
            ORDER BY e.nombre ASC
        `;
        const result = await pool.query(query, [idAtleta]);
        return result.rows;
    }

    // Obtener marca específica de un atleta en un ejercicio
    static async getMarca(idAtleta, idEjercicio) {
        const query = `
            SELECT * FROM progreso_atleta 
            WHERE id_atleta = $1 AND id_ejercicio = $2
        `;
        const result = await pool.query(query, [idAtleta, idEjercicio]);
        return result.rows[0];
    }

    // Obtener todos los ejercicios disponibles con o sin marca del atleta
    static async getEjerciciosConProgreso(idAtleta) {
        const query = `
            SELECT 
                e.id_ejercicio,
                e.nombre,
                e.descripcion,
                e.imagen_url,
                p.marca_maxima,
                p.fecha_actualizacion
            FROM ejercicio e
            LEFT JOIN progreso_atleta p ON e.id_ejercicio = p.id_ejercicio AND p.id_atleta = $1
            WHERE e.activo = true
            ORDER BY e.nombre ASC
        `;
        const result = await pool.query(query, [idAtleta]);
        return result.rows;
    }

    // Crear o actualizar marca
    static async upsertMarca(idAtleta, idEjercicio, marcaNueva) {
        // Primero obtener la marca anterior si existe
        const marcaAnterior = await this.getMarca(idAtleta, idEjercicio);
        
        const query = `
            INSERT INTO progreso_atleta (id_atleta, id_ejercicio, marca_maxima)
            VALUES ($1, $2, $3)
            ON CONFLICT (id_atleta, id_ejercicio)
            DO UPDATE SET 
                marca_maxima = $3,
                fecha_actualizacion = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const result = await pool.query(query, [idAtleta, idEjercicio, marcaNueva]);
        
        // Calcular el progreso
        let progreso = {
            marca_anterior: marcaAnterior ? marcaAnterior.marca_maxima : 0,
            marca_nueva: marcaNueva,
            diferencia: marcaNueva - (marcaAnterior ? marcaAnterior.marca_maxima : 0),
            tipo: 'nuevo' // nuevo, mejora, igual, descenso
        };

        if (marcaAnterior) {
            if (marcaNueva > marcaAnterior.marca_maxima) {
                progreso.tipo = 'mejora';
            } else if (marcaNueva === marcaAnterior.marca_maxima) {
                progreso.tipo = 'igual';
            } else {
                progreso.tipo = 'descenso';
            }
        }

        return {
            registro: result.rows[0],
            progreso
        };
    }

    // Eliminar marca
    static async deleteMarca(idAtleta, idEjercicio) {
        const query = `
            DELETE FROM progreso_atleta 
            WHERE id_atleta = $1 AND id_ejercicio = $2
            RETURNING *
        `;
        const result = await pool.query(query, [idAtleta, idEjercicio]);
        return result.rows[0];
    }

    // Obtener estadísticas del atleta
    static async getEstadisticas(idAtleta) {
        const query = `
            SELECT 
                COUNT(*) as total_ejercicios,
                AVG(marca_maxima) as promedio_marcas,
                MAX(marca_maxima) as marca_mas_alta,
                MIN(marca_maxima) as marca_mas_baja
            FROM progreso_atleta
            WHERE id_atleta = $1
        `;
        const result = await pool.query(query, [idAtleta]);
        return result.rows[0];
    }

    // Obtener historial de un ejercicio específico (si en el futuro se guarda historial)
    static async getHistorial(idAtleta, idEjercicio) {
        const query = `
            SELECT * FROM progreso_atleta
            WHERE id_atleta = $1 AND id_ejercicio = $2
            ORDER BY fecha_actualizacion DESC
        `;
        const result = await pool.query(query, [idAtleta, idEjercicio]);
        return result.rows;
    }
}

module.exports = ProgresoModel;
