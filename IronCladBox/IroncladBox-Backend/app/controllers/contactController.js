const ContactModel = require('../models/ContactModel');
const { validateNotEmpty, validateMaxLength, sanitizeString } = require('../utils/validators');

// Controlador para contacto
const contactController = {
  // Enviar mensaje de contacto
  sendContact: async (req, res) => {
    try {
      const contactData = req.body;

      // Rechazar honeypot
      if (contactData.website && contactData.website.trim() !== '') {
        return res.status(201).json({
          success: true,
          message: '¡Mensaje enviado exitosamente! Te contactaremos pronto.'
        });
      }

      // Validación básica
      if (!contactData.name || !contactData.email || !contactData.message) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos: name, email, message'
        });
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactData.email)) {
        return res.status(400).json({
          success: false,
          message: 'Email inválido'
        });
      }

      // Validar longitud del mensaje
      const sanitizedName = sanitizeString(contactData.name);
      const sanitizedMessage = sanitizeString(contactData.message);

      const nameErr = validateNotEmpty(sanitizedName, 'Nombre');
      if (nameErr) return res.status(400).json({ success: false, message: nameErr });

      const msgLengthErr = validateNotEmpty(sanitizedMessage, 'Mensaje');
      if (msgLengthErr) return res.status(400).json({ success: false, message: msgLengthErr });

      if (sanitizedMessage.length < 10) {
        return res.status(400).json({ success: false, message: 'El mensaje debe tener al menos 10 caracteres' });
      }

      const maxLenErr = validateMaxLength(sanitizedMessage, 1000, 'Mensaje');
      if (maxLenErr) return res.status(400).json({ success: false, message: maxLenErr });

      // Guardar en tabla contacto de la DB
      try {
        const { query } = require('../../config/database');
        const sql = `
          INSERT INTO contacto (nombre, email, telefono, mensaje, estado)
          VALUES ($1, $2, $3, $4, 'PENDIENTE')
          RETURNING *
        `;
        const result = await query(sql, [
          sanitizedName,
          contactData.email.trim(),
          contactData.phone || null,
          sanitizedMessage
        ]);
        return res.status(201).json({
          success: true,
          message: '¡Mensaje enviado exitosamente! Te contactaremos pronto.',
          data: result.rows[0]
        });
      } catch (dbError) {
        // Fallback a modelo en memoria si la tabla no existe aún
        const newContact = ContactModel.saveContact({
          name: sanitizedName,
          email: contactData.email.trim(),
          phone: contactData.phone,
          message: sanitizedMessage
        });
        return res.status(201).json({
          success: true,
          message: '¡Mensaje enviado exitosamente! Te contactaremos pronto.',
          data: newContact
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al enviar el mensaje',
        error: error.message
      });
    }
  },

  // Obtener todos los mensajes de contacto
  getAllContacts: async (req, res) => {
    try {
      try {
        const { query } = require('../../config/database');
        const result = await query('SELECT * FROM contacto ORDER BY created_at DESC');
        return res.json({ success: true, data: result.rows });
      } catch (dbError) {
        const contacts = ContactModel.getAllContacts();
        return res.json({ success: true, data: contacts });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener los mensajes',
        error: error.message
      });
    }
  },

  // Actualizar estado del contacto
  updateContactStatus: (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const updatedContact = ContactModel.updateContactStatus(id, status);
      
      if (!updatedContact) {
        return res.status(404).json({
          success: false,
          message: 'Contacto no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Estado actualizado exitosamente',
        data: updatedContact
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el estado',
        error: error.message
      });
    }
  }
};

module.exports = contactController;
