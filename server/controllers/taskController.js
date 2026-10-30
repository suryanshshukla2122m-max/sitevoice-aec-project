const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { isValidObjectId } = require('../middleware/validateRequest');

/**
 * GET /api/tasks
 * Strictly whitelisted primitive query filters: projectId, assigneeId, status, priority, search.
 */
async function getTasks(req, res, next) {
  try {
    const { projectId, assigneeId, status, priority, search } = req.query;

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

    // 4. priority whitelist
    if (typeof priority === 'string' && priority.trim().length > 0) {
      const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
      const matched = allowedPriorities.find((p) => p.toLowerCase() === priority.trim().toLowerCase());
      if (matched) {
        filter.priority = matched;
      }
    }

    // 5. optional text search term
    if (typeof search === 'string' && search.trim().length > 0) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = new RegExp(safeSearch, 'i');
    }

    const tasks = await Task.find(filter)
      .populate('assigneeId', 'name role email company')
      .populate('projectId', 'name code location')
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
 * GET /api/tasks/my-work
 * Dedicated endpoint returning only tasks assigned to the logged-in contractor / worker.
 */
async function getMyWork(req, res, next) {
  try {
    let targetUserId = req.user ? req.user._id : null;

    // Support query override for testing or development
    if (req.query.assigneeId && isValidObjectId(req.query.assigneeId)) {
      // Admin and PM can inspect another worker's assigned work
      if (!req.user || req.user.role === 'Admin' || req.user.role === 'Project Manager') {
        targetUserId = req.query.assigneeId;
      }
    }

    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to view assigned work.',
      });
    }

    const filter = { assigneeId: targetUserId };

    if (req.query.status) {
      const allowed = ['Pending', 'In Progress', 'Completed'];
      const matched = allowed.find((s) => s.toLowerCase() === String(req.query.status).trim().toLowerCase());
      if (matched) filter.status = matched;
    }

    const tasks = await Task.find(filter)
      .populate('projectId', 'name code location')
      .populate('assigneeId', 'name role email company')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    const now = new Date();
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'Pending').length,
      inProgress: tasks.filter((t) => t.status === 'In Progress').length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
      overdue: tasks.filter((t) => t.status !== 'Completed' && t.dueDate && new Date(t.dueDate) < now).length,
    };

    return res.status(200).json({
      success: true,
      count: tasks.length,
      stats,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tasks
 * Task creation by Admin or Project Manager.
 */
async function createTask(req, res, next) {
  try {
    // Role check: Only Admin and Project Manager can create tasks
    if (req.user && req.user.role !== 'Admin' && req.user.role !== 'Project Manager') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Workers and contractors cannot create tasks. Please contact your Project Manager.',
      });
    }

    const {
      projectId,
      title,
      dueDate,
      assigneeId,
      description = '',
      instructions = '',
      priority = 'Medium',
      status = 'Pending',
    } = req.body;

    const { createTaskRecord } = require('../services/taskService');
    const { task } = await createTaskRecord({
      projectId,
      title,
      dueDate,
      assigneeId,
      description,
      instructions,
      priority,
      status,
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: task,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/tasks/:id
 * Updates task status, details, or assignments with strict role enforcement.
 */
async function updateTask(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Role authorization check:
    // If worker/contractor, verify the task is assigned to them
    const isWorker =
      req.user &&
      req.user.role !== 'Admin' &&
      req.user.role !== 'Project Manager';

    if (isWorker) {
      const isAssignedToUser = String(task.assigneeId) === String(req.user._id);
      if (!isAssignedToUser) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update tasks assigned directly to you.',
        });
      }
    }

    const updates = {};
    const { status, title, dueDate, assigneeId, description, instructions, priority } = req.body;

    if (status !== undefined) {
      const allowed = ['Pending', 'In Progress', 'Completed'];
      const matched = allowed.find((s) => s.toLowerCase() === String(status).trim().toLowerCase());
      if (!matched) {
        return res.status(400).json({
          success: false,
          message: `Invalid status "${status}". Allowed: ${allowed.join(', ')}`,
        });
      }
      updates.status = matched;
    }

    // Workers can only update status and add updates; non-workers can update fields
    if (!isWorker) {
      if (title !== undefined && typeof title === 'string' && title.trim()) updates.title = title.trim();
      if (description !== undefined && typeof description === 'string') updates.description = description.trim();
      if (instructions !== undefined && typeof instructions === 'string') updates.instructions = instructions.trim();
      if (priority !== undefined) {
        const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
        const matchedP = allowedPriorities.find((p) => p.toLowerCase() === String(priority).trim().toLowerCase());
        if (matchedP) updates.priority = matchedP;
      }
      if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;
      if (assigneeId !== undefined) {
        if (!isValidObjectId(assigneeId)) {
          return res.status(400).json({ success: false, message: 'Invalid assigneeId.' });
        }
        updates.assigneeId = assigneeId;
      }
    }

    const updated = await Task.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('assigneeId', 'name role email company')
      .populate('projectId', 'name code location')
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/tasks/:id/updates
 * Adds a progress update/note to the task history.
 */
async function addTaskUpdate(req, res, next) {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format.' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Update text is required.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Authorization: Worker must be assigned or user must be Admin/PM
    if (req.user && req.user.role !== 'Admin' && req.user.role !== 'Project Manager') {
      if (String(task.assigneeId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only add updates to your assigned tasks.',
        });
      }
    }

    const newUpdate = {
      text: text.trim(),
      authorName: req.user ? req.user.name : 'Team Member',
      authorRole: req.user ? req.user.role : 'Contractor',
      createdAt: new Date(),
    };

    task.updates.push(newUpdate);
    await task.save();

    const populated = await Task.findById(id)
      .populate('assigneeId', 'name role email company')
      .populate('projectId', 'name code location')
      .lean();

    return res.status(201).json({
      success: true,
      message: 'Progress update recorded successfully.',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/tasks/:id
 * Restricted to Admin and Project Manager.
 */
async function deleteTask(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format.' });
    }

    // Reject worker deletion attempt
    if (req.user && req.user.role !== 'Admin' && req.user.role !== 'Project Manager') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Workers and contractors cannot delete tasks.',
      });
    }

    const deleted = await Task.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTasks,
  getMyWork,
  createTask,
  updateTask,
  addTaskUpdate,
  deleteTask,
};
