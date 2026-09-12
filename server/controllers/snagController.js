const Snag = require('../models/Snag');
const Project = require('../models/Project');
const User = require('../models/User');
const { isValidObjectId } = require('../middleware/validateRequest');

/**
 * GET /api/snags
 * Strictly whitelisted primitive query filters: projectId, location, status, priority, assigneeId, search.
 */
async function getSnags(req, res, next) {
  try {
    const { projectId, location, status, priority, assigneeId, search } = req.query;

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

    // 3. location filter (regex escaped)
    if (typeof location === 'string' && location.trim().length > 0) {
      const safeLocation = location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.location = new RegExp(safeLocation, 'i');
    }

    // 4. status whitelist
    if (typeof status === 'string' && status.trim().length > 0) {
      const allowedStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
      const matched = allowedStatuses.find((s) => s.toLowerCase() === status.trim().toLowerCase());
      if (matched) {
        filter.status = matched;
      }
    }

    // 5. priority whitelist
    if (typeof priority === 'string' && priority.trim().length > 0) {
      const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
      const matched = allowedPriorities.find((p) => p.toLowerCase() === priority.trim().toLowerCase());
      if (matched) {
        filter.priority = matched;
      }
    }

    // 6. optional text search term
    if (typeof search === 'string' && search.trim().length > 0) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = new RegExp(safeSearch, 'i');
    }

    const snags = await Snag.find(filter)
      .populate('assigneeId', 'name role')
      .populate('projectId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: snags.length,
      data: snags,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/snags
 * Direct snag creation endpoint.
 */
async function createSnag(req, res, next) {
  try {
    const { projectId, title, location, priority = 'Medium', assigneeId, description = '' } = req.body;

    const { getActiveProject } = require('../services/projectService');
    const project = await getActiveProject(projectId);

    if (!project) {
      return res.status(400).json({ success: false, message: 'Valid active project is required.' });
    }
    if (!isValidObjectId(assigneeId)) {
      return res.status(400).json({ success: false, message: 'Valid assigneeId is required.' });
    }

    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      return res.status(404).json({ success: false, message: 'Assignee not found.' });
    }

    const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const validPriority = allowedPriorities.includes(priority) ? priority : 'Medium';

    const snag = await Snag.create({
      projectId: project._id,
      title: title.trim(),
      location: location.trim(),
      priority: validPriority,
      assigneeId: assignee._id,
      description: description.trim(),
      status: 'Open',
    });

    const populated = await Snag.findById(snag._id)
      .populate('assigneeId', 'name role')
      .lean();

    return res.status(201).json({
      success: true,
      data: populated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSnags,
  createSnag,
};
