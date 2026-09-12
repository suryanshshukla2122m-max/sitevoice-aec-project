const Project = require('../models/Project');
const Snag = require('../models/Snag');
const Task = require('../models/Task');
const User = require('../models/User');
const { isValidObjectId } = require('../middleware/validateRequest');

/**
 * GET /api/projects
 * List all projects.
 */
async function getProjects(req, res, next) {
  try {
    const { ensureDemoData } = require('../services/projectService');
    await ensureDemoData();

    const projects = await Project.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/projects/:id/summary
 * Calculates real-time metrics directly from MongoDB.
 */
async function getProjectSummary(req, res, next) {
  try {
    const { id } = req.params;

    const { getActiveProject } = require('../services/projectService');
    let project = null;

    if (isValidObjectId(id)) {
      project = await Project.findById(id).lean();
    }

    if (!project) {
      project = await getActiveProject(id);
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Project with ID "${id}" was not found.`,
      });
    }

    const projectId = project._id;

    const [
      totalSnags,
      openSnags,
      resolvedSnags,
      totalTasks,
      pendingTasks,
      completedTasks,
      teamMembers,
    ] = await Promise.all([
      Snag.countDocuments({ projectId }),
      Snag.countDocuments({ projectId, status: 'Open' }),
      Snag.countDocuments({ projectId, status: { $in: ['Resolved', 'Closed'] } }),
      Task.countDocuments({ projectId }),
      Task.countDocuments({ projectId, status: 'Pending' }),
      Task.countDocuments({ projectId, status: 'Completed' }),
      User.find({}).select('name role').lean(),
    ]);

    const now = new Date();
    const overdueTasks = await Task.countDocuments({
      projectId,
      status: { $ne: 'Completed' },
      dueDate: { $ne: null, $lt: now },
    });

    const metrics = {
      totalSnags,
      openSnags,
      resolvedSnags,
      totalTasks,
      pendingTasks,
      completedTasks,
      overdueTasks,
    };

    return res.status(200).json({
      success: true,
      project,
      metrics,
      teamCount: teamMembers.length,
      team: teamMembers,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProjects,
  getProjectSummary,
};
