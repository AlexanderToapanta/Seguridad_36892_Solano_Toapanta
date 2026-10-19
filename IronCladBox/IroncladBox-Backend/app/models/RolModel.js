const { query } = require('../../config/database');

class RolModel {
  // Obtener todos los roles
  static async findAll() {
    const sql = 'SELECT * FROM rol ORDER BY id_rol';
    const result = await query(sql);
    return result.rows;
  }

  // Buscar rol por nombre
  static async findByName(nombre) {
    const sql = 'SELECT * FROM rol WHERE nombre = $1';
    const result = await query(sql, [nombre]);
    return result.rows[0];
  }

  // Buscar rol por ID
  static async findById(id_rol) {
    const sql = 'SELECT * FROM rol WHERE id_rol = $1';
    const result = await query(sql, [id_rol]);
    return result.rows[0];
  }
}

module.exports = RolModel;
