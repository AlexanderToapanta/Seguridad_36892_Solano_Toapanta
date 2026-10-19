const express = require('express');
const router = express.Router();
const membersController = require('../controllers/membersController');
const { authMiddleware, isAthlete } = require('../middlewares/authMiddleware');

// Rutas para membresías y miembros
router.get('/check-membership', authMiddleware, membersController.checkMembershipStatus);
router.get('/my-membership', authMiddleware, isAthlete, membersController.getMyMembership);
router.put('/my-membership', authMiddleware, isAthlete, membersController.updateMyMembership);
router.delete('/my-membership', authMiddleware, isAthlete, membersController.cancelMyMembership);
router.get('/memberships', membersController.getAllMemberships);
router.get('/memberships/:id', membersController.getMembershipById);
router.post('/register', membersController.registerMember);
router.get('/', membersController.getAllMembers);

module.exports = router;
