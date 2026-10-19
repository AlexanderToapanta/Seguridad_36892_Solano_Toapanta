const { pool } = require('../../config/database');

class EjercicioModel {
  /**
   * Obtener todos los ejercicios activos
   */
  static async getAll(includeInactive = false) {
    try {
      const query = includeInactive
        ? 'SELECT * FROM ejercicio ORDER BY nombre ASC'
        : 'SELECT * FROM ejercicio WHERE activo = true ORDER BY nombre ASC';
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error al obtener ejercicios:', error);
      throw error;
    }
  }

  /**
   * Obtener ejercicio por ID
   */
  static async getById(id) {
    try {
      const query = 'SELECT * FROM ejercicio WHERE id_ejercicio = $1';
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error al obtener ejercicio por ID:', error);
      throw error;
    }
  }

  /**
   * Buscar ejercicios por nombre
   */
  static async searchByName(searchTerm) {
    try {
      const query = `
        SELECT * FROM ejercicio 
        WHERE nombre ILIKE $1 AND activo = true
        ORDER BY nombre ASC
      `;
      const result = await pool.query(query, [`%${searchTerm}%`]);
      return result.rows;
    } catch (error) {
      console.error('Error al buscar ejercicios:', error);
      throw error;
    }
  }

  /**
   * Crear nuevo ejercicio
   */
  static async create(ejercicioData) {
    const { nombre, descripcion, imagen_url } = ejercicioData;
    
    try {
      const query = `
        INSERT INTO ejercicio (nombre, descripcion, imagen_url)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const values = [nombre, descripcion || null, imagen_url || null];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Ya existe un ejercicio con ese nombre');
      }
      console.error('Error al crear ejercicio:', error);
      throw error;
    }
  }

  /**
   * Actualizar ejercicio
   */
  static async update(id, ejercicioData) {
    const { nombre, descripcion, imagen_url } = ejercicioData;
    
    try {
      const query = `
        UPDATE ejercicio 
        SET nombre = $1, descripcion = $2, imagen_url = $3
        WHERE id_ejercicio = $4
        RETURNING *
      `;
      const values = [nombre, descripcion || null, imagen_url || null, id];
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error('Ejercicio no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Ya existe un ejercicio con ese nombre');
      }
      console.error('Error al actualizar ejercicio:', error);
      throw error;
    }
  }

  /**
   * Eliminar ejercicio (soft delete)
   */
  static async delete(id) {
    try {
      const query = `
        UPDATE ejercicio 
        SET activo = false
        WHERE id_ejercicio = $1
        RETURNING *
      `;
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Ejercicio no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al eliminar ejercicio:', error);
      throw error;
    }
  }

  /**
   * Eliminar ejercicio permanentemente
   */
  static async deletePermanently(id) {
    try {
      const query = 'DELETE FROM ejercicio WHERE id_ejercicio = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Ejercicio no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al eliminar ejercicio permanentemente:', error);
      throw error;
    }
  }

  /**
   * Reactivar ejercicio
   */
  static async reactivate(id) {
    try {
      const query = `
        UPDATE ejercicio 
        SET activo = true
        WHERE id_ejercicio = $1
        RETURNING *
      `;
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Ejercicio no encontrado');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error al reactivar ejercicio:', error);
      throw error;
    }
  }

  /**
   * Contar ejercicios
   */
  static async count(includeInactive = false) {
    try {
      const query = includeInactive
        ? 'SELECT COUNT(*) FROM ejercicio'
        : 'SELECT COUNT(*) FROM ejercicio WHERE activo = true';
      
      const result = await pool.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Error al contar ejercicios:', error);
      throw error;
    }
  }
}

module.exports = EjercicioModel;
