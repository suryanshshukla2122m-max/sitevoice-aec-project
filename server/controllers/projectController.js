const Project = require('../models/Project');
const Snag = require('../models/Snag');
const Task = require('../models/Task');
const User = require('../models/User');
const { isValidObjectId } = require('../middleware/validateRequest');

/**
 * GET /api/projects
 * List projects with role-aware scoping and project-level statistics.
 */
async function getProjects(req, res, next) {
  try {
    const { ensureDemoData } = require('../services/projectService');
    await ensureDemoData();

    let filter = {};

    // Scoping for authenticated non-admin users
    if (req.user && req.user.role !== 'Admin') {
      const assignedIds = Array.isArray(req.user.assignedProjects) ? req.user.assignedProjects : [];
      filter._id = { $in: assignedIds };
    }

    const projects = await Project.find(filter)
      .populate('managerId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Attach task & problem counts to each project
    const enhancedProjects = await Promise.all(
      projects.map(async (project) => {
        const [totalTasks, pendingTasks, completedTasks, openProblems, resolvedProblems] = await Promise.all([
          Task.countDocuments({ projectId: project._id }),
          Task.countDocuments({ projectId: project._id, status: { $in: ['Pending', 'In Progress'] } }),
          Task.countDocuments({ projectId: project._id, status: 'Completed' }),
          Snag.countDocuments({ projectId: project._id, status: { $in: ['Open', 'In Progress'] } }),
          Snag.countDocuments({ projectId: project._id, status: { $in: ['Resolved', 'Closed'] } }),
        ]);

        const totalItems = totalTasks + openProblems + resolvedProblems;
        const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          ...project,
          stats: {
            totalTasks,
            pendingTasks,
            completedTasks,
            openProblems,
            resolvedProblems,
            progressPct,
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: enhancedProjects.length,
      data: enhancedProjects,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/projects
 * Admin creates new construction project.
 */
async function createProject(req, res, next) {
  try {
    const {
      name,
      code,
      fullName,
      location,
      description = '',
      status = 'Active',
      budget = '',
      managerId = null,
      startDate = null,
      targetDate = null,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required.' });
    }
    if (!location || !location.trim()) {
      return res.status(400).json({ success: false, message: 'Project location is required.' });
    }

    // Generate clean code if not provided
    const cleanCode = code && code.trim() ? code.trim().toUpperCase() : `PRJ-${Math.floor(100 + Math.random() * 900)}`;

    const project = await Project.create({
      name: name.trim(),
      code: cleanCode,
      fullName: fullName && fullName.trim() ? fullName.trim() : `${name.trim()} Construction Project`,
      location: location.trim(),
      description: description.trim(),
      status,
      budget: budget.trim(),
      managerId: managerId && isValidObjectId(managerId) ? managerId : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      targetDate: targetDate ? new Date(targetDate) : null,
    });

    // If manager assigned, add project to manager's assignedProjects
    if (project.managerId) {
      await User.findByIdAndUpdate(project.managerId, {
        $addToSet: { assignedProjects: project._id },
      });
    }

    return res.status(201).json({
      success: true,
      message: `Project "${project.name}" (${project.code}) created successfully.`,
      data: project,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/projects/:id
 * Admin or PM updates project details.
 */
async function updateProject(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format.' });
    }

    const updates = {};
    const { name, code, fullName, location, description, status, budget, managerId } = req.body;

    if (name) updates.name = name.trim();
    if (code) updates.code = code.trim().toUpperCase();
    if (fullName) updates.fullName = fullName.trim();
    if (location) updates.location = location.trim();
    if (description !== undefined) updates.description = description.trim();
    if (status) {
      const allowed = ['Active', 'On Hold', 'Completed'];
      if (allowed.includes(status)) updates.status = status;
    }
    if (budget !== undefined) updates.budget = budget.trim();
    if (managerId !== undefined) {
      updates.managerId = isValidObjectId(managerId) ? managerId : null;
    }

    const updated = await Project.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('managerId', 'name email role')
      .lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (updates.managerId) {
      await User.findByIdAndUpdate(updates.managerId, {
        $addToSet: { assignedProjects: updated._id },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Project "${updated.name}" updated successfully.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/projects/:id
 * Admin deletes project.
 */
async function deleteProject(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid project ID format.' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Cascade delete associated snags and tasks to keep DB clean
    await Promise.all([
      Task.deleteMany({ projectId: id }),
      Snag.deleteMany({ projectId: id }),
      User.updateMany({ assignedProjects: id }, { $pull: { assignedProjects: id } }),
      Project.findByIdAndDelete(id),
    ]);

    return res.status(200).json({
      success: true,
      message: `Project "${project.name}" and associated records deleted successfully.`,
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
      project = await Project.findById(id).populate('managerId', 'name email role').lean();
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
      inProgressTasks,
      completedTasks,
      teamMembers,
    ] = await Promise.all([
      Snag.countDocuments({ projectId }),
      Snag.countDocuments({ projectId, status: 'Open' }),
      Snag.countDocuments({ projectId, status: { $in: ['Resolved', 'Closed'] } }),
      Task.countDocuments({ projectId }),
      Task.countDocuments({ projectId, status: 'Pending' }),
      Task.countDocuments({ projectId, status: 'In Progress' }),
      Task.countDocuments({ projectId, status: 'Completed' }),
      User.find({
        $or: [{ assignedProjects: projectId }, { role: 'Admin' }],
      })
        .select('name role email phone company')
        .lean(),
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
      inProgressTasks,
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
  createProject,
  updateProject,
  deleteProject,
  getProjectSummary,
};
