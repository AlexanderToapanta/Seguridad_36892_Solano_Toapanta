const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Rutas para contacto
router.post('/', contactController.sendContact);
router.get('/', contactController.getAllContacts);
router.put('/:id/status', contactController.updateContactStatus);

module.exports = router;
