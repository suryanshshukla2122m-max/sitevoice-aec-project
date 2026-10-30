const express = require('express');
const router = express.Router();
const {
  getTasks,
  getMyWork,
  createTask,
  updateTask,
  addTaskUpdate,
  deleteTask,
} = require('../controllers/taskController');
const { validateTaskCreate } = require('../middleware/validateRequest');

router.get('/', getTasks);
router.get('/my-work', getMyWork);
router.post('/', validateTaskCreate, createTask);
router.patch('/:id', updateTask);
router.post('/:id/updates', addTaskUpdate);
router.delete('/:id', deleteTask);

module.exports = router;
