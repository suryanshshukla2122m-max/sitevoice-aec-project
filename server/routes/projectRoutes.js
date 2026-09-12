const express = require('express');
const router = express.Router();
const { getProjects, getProjectSummary } = require('../controllers/projectController');

router.get('/', getProjects);
router.get('/:id/summary', getProjectSummary);

module.exports = router;
