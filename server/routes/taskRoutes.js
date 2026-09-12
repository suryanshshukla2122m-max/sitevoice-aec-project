const express = require('express');
const router = express.Router();
const { getTasks, createTask } = require('../controllers/taskController');
const { validateTaskCreate } = require('../middleware/validateRequest');

router.get('/', getTasks);
router.post('/', validateTaskCreate, createTask);

module.exports = router;
