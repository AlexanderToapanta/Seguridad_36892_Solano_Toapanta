const EjercicioModel = require('../models/EjercicioModel');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/ejercicios');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ejercicio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

class EjerciciosController {
  /**
   * Obtener todos los ejercicios
   */
  static async getAll(req, res) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const ejercicios = await EjercicioModel.getAll(includeInactive);
      
      res.status(200).json({
        success: true,
        data: ejercicios,
        total: ejercicios.length
      });
    } catch (error) {
      console.error('Error en getAll:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ejercicios',
        error: error.message
      });
    }
  }

  /**
   * Obtener ejercicio por ID
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const ejercicio = await EjercicioModel.getById(id);
      
      if (!ejercicio) {
        return res.status(404).json({
          success: false,
          message: 'Ejercicio no encontrado'
        });
      }
      
      res.status(200).json({
        success: true,
        data: ejercicio
      });
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ejercicio',
        error: error.message
      });
    }
  }

  /**
   * Buscar ejercicios por nombre
   */
  static async search(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Parámetro de búsqueda requerido'
        });
      }
      
      const ejercicios = await EjercicioModel.searchByName(q);
      
      res.status(200).json({
        success: true,
        data: ejercicios,
        total: ejercicios.length
      });
    } catch (error) {
      console.error('Error en search:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar ejercicios',
        error: error.message
      });
    }
  }

  /**
   * Crear nuevo ejercicio
   */
  static async create(req, res) {
    try {
      const { nombre, descripcion } = req.body;
      
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del ejercicio es requerido'
        });
      }
      
      const ejercicioData = {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        imagen_url: req.file ? `/uploads/ejercicios/${req.file.filename}` : null
      };
      
      const nuevoEjercicio = await EjercicioModel.create(ejercicioData);
      
      res.status(201).json({
        success: true,
        message: 'Ejercicio creado exitosamente',
        data: nuevoEjercicio
      });
    } catch (error) {
      // Si hay error y se subió una imagen, eliminarla
      if (req.file) {
        const filePath = path.join(__dirname, '../../public/uploads/ejercicios', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      console.error('Error en create:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al crear ejercicio',
        error: error.message
      });
    }
  }

  /**
   * Actualizar ejercicio
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, deleteImage } = req.body;
      
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del ejercicio es requerido'
        });
      }
      
      // Obtener ejercicio actual para manejar imagen anterior
      const ejercicioActual = await EjercicioModel.getById(id);
      if (!ejercicioActual) {
        return res.status(404).json({
          success: false,
          message: 'Ejercicio no encontrado'
        });
      }
      
      let imagen_url = ejercicioActual.imagen_url;
      
      // Si se solicita eliminar imagen
      if (deleteImage === 'true' && imagen_url) {
        const oldImagePath = path.join(__dirname, '../../public', imagen_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
        imagen_url = null;
      }
      
      // Si se subió nueva imagen
      if (req.file) {
        // Eliminar imagen anterior si existe
        if (imagen_url) {
          const oldImagePath = path.join(__dirname, '../../public', imagen_url);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        imagen_url = `/uploads/ejercicios/${req.file.filename}`;
      }
      
      const ejercicioData = {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        imagen_url: imagen_url
      };
      
      const ejercicioActualizado = await EjercicioModel.update(id, ejercicioData);
      
      res.status(200).json({
        success: true,
        message: 'Ejercicio actualizado exitosamente',
        data: ejercicioActualizado
      });
    } catch (error) {
      // Si hay error y se subió una imagen, eliminarla
      if (req.file) {
        const filePath = path.join(__dirname, '../../public/uploads/ejercicios', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      console.error('Error en update:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al actualizar ejercicio',
        error: error.message
      });
    }
  }

  /**
   * Eliminar ejercicio (soft delete)
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const ejercicioEliminado = await EjercicioModel.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Ejercicio desactivado exitosamente',
        data: ejercicioEliminado
      });
    } catch (error) {
      console.error('Error en delete:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al desactivar ejercicio',
        error: error.message
      });
    }
  }

  /**
   * Reactivar ejercicio
   */
  static async reactivate(req, res) {
    try {
      const { id } = req.params;
      const ejercicioReactivado = await EjercicioModel.reactivate(id);
      
      res.status(200).json({
        success: true,
        message: 'Ejercicio reactivado exitosamente',
        data: ejercicioReactivado
      });
    } catch (error) {
      console.error('Error en reactivate:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al reactivar ejercicio',
        error: error.message
      });
    }
  }

  /**
   * Obtener estadísticas de ejercicios
   */
  static async getStats(req, res) {
    try {
      const totalActivos = await EjercicioModel.count(false);
      const totalTodos = await EjercicioModel.count(true);
      const totalInactivos = totalTodos - totalActivos;
      
      res.status(200).json({
        success: true,
        data: {
          total: totalTodos,
          activos: totalActivos,
          inactivos: totalInactivos
        }
      });
    } catch (error) {
      console.error('Error en getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
}

// Exportar el controller y el middleware de upload
const EjerciciosControllerInstance = new EjerciciosController();

module.exports = {
  EjerciciosController: {
    getAll: EjerciciosController.getAll,
    getById: EjerciciosController.getById,
    search: EjerciciosController.search,
    create: EjerciciosController.create,
    update: EjerciciosController.update,
    delete: EjerciciosController.delete,
    reactivate: EjerciciosController.reactivate,
    getStats: EjerciciosController.getStats
  },
  uploadEjercicioImage: upload.single('imagen')
};
