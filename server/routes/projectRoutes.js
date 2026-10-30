const express = require('express');
const router = express.Router();
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectSummary,
} = require('../controllers/projectController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', getProjects);
router.post('/', requireAuth, requireRole('Admin'), createProject);
router.get('/:id/summary', getProjectSummary);
router.patch('/:id', requireAuth, requireRole('Admin', 'Project Manager'), updateProject);
router.delete('/:id', requireAuth, requireRole('Admin'), deleteProject);

module.exports = router;
