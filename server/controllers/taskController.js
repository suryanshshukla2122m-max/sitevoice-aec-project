const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { isValidObjectId } = require('../middleware/validateRequest');

/**
 * GET /api/tasks
 * Strictly whitelisted primitive query filters: projectId, assigneeId, status, search.
 */
async function getTasks(req, res, next) {
  try {
    const { projectId, assigneeId, status, search } = req.query;

    const filter = {};

    // 1. projectId validation & filter
    if (projectId !== undefined) {
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid projectId format. Must be a valid 24-character hexadecimal MongoDB ObjectId.',
        });
      }
      filter.projectId = projectId;
    }

    // 2. assigneeId validation & filter
    if (assigneeId !== undefined) {
      if (!isValidObjectId(assigneeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assigneeId format. Must be a valid 24-character hexadecimal MongoDB ObjectId.',
        });
      }
      filter.assigneeId = assigneeId;
    }

    // 3. status whitelist
    if (typeof status === 'string' && status.trim().length > 0) {
      const allowedStatuses = ['Pending', 'In Progress', 'Completed'];
      const matched = allowedStatuses.find((s) => s.toLowerCase() === status.trim().toLowerCase());
      if (matched) {
        filter.status = matched;
      }
    }

    // 4. optional text search term
    if (typeof search === 'string' && search.trim().length > 0) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = new RegExp(safeSearch, 'i');
    }

    const tasks = await Task.find(filter)
      .populate('assigneeId', 'name role')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tasks
 * Direct task creation endpoint.
 */
async function createTask(req, res, next) {
  try {
    const { projectId, title, dueDate, assigneeId, description = '', status = 'Pending' } = req.body;

    const { createTaskRecord } = require('../services/taskService');
    const { task } = await createTaskRecord({
      projectId,
      title,
      dueDate,
      assigneeId,
      description,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'Command processed successfully.',
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTasks,
  createTask,
};
