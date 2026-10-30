const express = require('express');
const router = express.Router();
const {
  login,
  getMe,
  switchUser,
  listUsers,
  createUser,
  updateUser,
} = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', getMe);
router.post('/switch', switchUser);
router.get('/users', listUsers);
router.post('/users', requireAuth, requireRole('Admin'), createUser);
router.patch('/users/:id', requireAuth, requireRole('Admin'), updateUser);

module.exports = router;
