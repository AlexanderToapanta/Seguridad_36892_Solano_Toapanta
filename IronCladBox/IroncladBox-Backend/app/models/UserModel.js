const { query } = require('../../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  // Crear nuevo usuario
  static async create(userData) {
    const { nombre, apellido, email, password, id_rol, telefono } = userData;
    
    // Hash del password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const sql = `
      INSERT INTO usuario (nombre, apellido, email, password, id_rol, telefono)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_usuario, nombre, apellido, email, id_rol, estado, telefono
    `;
    
    const result = await query(sql, [nombre, apellido, email, hashedPassword, id_rol, telefono]);
    return result.rows[0];
  }

  // Buscar usuario por email
  static async findByEmail(email) {
    const sql = `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuario u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.email = $1
    `;
    
    const result = await query(sql, [email]);
    return result.rows[0];
  }

  // Buscar usuario por ID
  static async findById(id_usuario) {
    const sql = `
      SELECT u.*, r.nombre as rol_nombre
      FROM usuario u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1
    `;
    
    const result = await query(sql, [id_usuario]);
    return result.rows[0];
  }

  // Obtener todos los usuarios
  static async findAll() {
    const sql = `
      SELECT u.id_usuario, u.nombre, u.apellido, u.email, u.estado, r.nombre as rol_nombre
      FROM usuario u
      INNER JOIN rol r ON u.id_rol = r.id_rol
      ORDER BY u.id_usuario DESC
    `;
    
    const result = await query(sql);
    return result.rows;
  }

  // Verificar contraseña
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Actualizar estado del usuario
  static async updateStatus(id_usuario, estado) {
    const sql = `
      UPDATE usuario
      SET estado = $1
      WHERE id_usuario = $2
      RETURNING *
    `;
    
    const result = await query(sql, [estado, id_usuario]);
    return result.rows[0];
  }

  // Obtener perfil completo según rol
  static async getProfile(id_usuario) {
    const user = await this.findById(id_usuario);
    if (!user) return null;

    let profileData = { ...user };

    // Si es atleta, obtener datos de atleta
    if (user.rol_nombre === 'ATLETA') {
      const atletaSql = `
        SELECT * FROM atleta WHERE id_usuario = $1
      `;
      const atletaResult = await query(atletaSql, [id_usuario]);
      profileData.atleta = atletaResult.rows[0];
    }

    // Si es entrenador, obtener datos de entrenador
    if (user.rol_nombre === 'ENTRENADOR') {
      const entrenadorSql = `
        SELECT * FROM entrenador WHERE id_usuario = $1
      `;
      const entrenadorResult = await query(entrenadorSql, [id_usuario]);
      profileData.entrenador = entrenadorResult.rows[0];
    }

    return profileData;
  }
}

module.exports = UserModel;
