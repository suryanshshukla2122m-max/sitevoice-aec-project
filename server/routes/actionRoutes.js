const express = require('express');
const router = express.Router();
const { executeAction } = require('../controllers/actionController');
const { validateActionExecuteRequest } = require('../middleware/validateRequest');

router.post('/execute', validateActionExecuteRequest, executeAction);

module.exports = router;
