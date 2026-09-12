const Task = require('../models/Task');
const User = require('../models/User');
const { getActiveProject } = require('./projectService');
const { isValidObjectId } = require('../middleware/validateRequest');

/**
 * Creates and persists a new Task document in MongoDB.
 * Enforces schema requirements, resolves references, and logs execution stages.
 *
 * @param {object} params
 * @param {string|import('mongoose').Types.ObjectId} [params.projectId] - Project ID or reference
 * @param {string} params.title - Task title / scope
 * @param {string|Date} [params.dueDate] - Scheduled due date
 * @param {string|import('mongoose').Types.ObjectId} params.assigneeId - Valid assignee User ObjectId
 * @param {string} [params.description] - Optional description or notes
 * @param {string} [params.status] - Status ('Pending', 'In Progress', 'Completed')
 * @returns {Promise<{ task: object, project: object, assignee: object }>}
 */
async function createTaskRecord({
  projectId,
  title,
  dueDate,
  assigneeId,
  description = '',
  status = 'Pending',
}) {
  console.log(`[Task] Task action received: title="${title || ''}"`);

  if (!title || typeof title !== 'string' || !title.trim()) {
    const err = new Error('Task title is required.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Resolve Project (explicit ID if provided, otherwise active demo project)
  const project = await getActiveProject(projectId);
  if (!project) {
    const err = new Error('Valid active project is required to create a task.');
    err.statusCode = 400;
    throw err;
  }
  console.log(`[Task] Resolved projectId: ${project._id} ("${project.name}")`);

  // 2. Validate and resolve Assignee
  if (!assigneeId || !isValidObjectId(assigneeId)) {
    const err = new Error('Valid assigneeId format is required.');
    err.statusCode = 400;
    throw err;
  }

  const assignee = await User.findById(assigneeId);
  if (!assignee) {
    const err = new Error(`Assigned user/contractor with ID "${assigneeId}" not found.`);
    err.statusCode = 404;
    throw err;
  }
  console.log(`[Task] Resolved assigneeId: ${assignee._id} ("${assignee.name}" - ${assignee.role})`);

  // 3. Resolve Due Date (supports Date object, ISO string, or relative 'tomorrow')
  let parsedDate = null;
  if (dueDate) {
    if (typeof dueDate === 'string' && /\btomorrow\b/i.test(dueDate)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      parsedDate = tomorrow;
    } else {
      const d = new Date(dueDate);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }
  }
  console.log(`[Task] Resolved dueDate: ${parsedDate ? parsedDate.toISOString() : 'None'}`);

  // 4. Validate Status
  const allowedStatuses = ['Pending', 'In Progress', 'Completed'];
  const validStatus = allowedStatuses.includes(status) ? status : 'Pending';

  // 5. MongoDB Create Attempt
  console.log(`[Task] MongoDB create attempted for task: "${title.trim()}"`);
  try {
    const newTask = await Task.create({
      projectId: project._id,
      title: title.trim(),
      dueDate: parsedDate,
      assigneeId: assignee._id,
      description: (description || '').trim(),
      status: validStatus,
    });

    const populatedTask = await Task.findById(newTask._id)
      .populate('assigneeId', 'name role')
      .populate('projectId', 'name code')
      .lean();

    console.log(`[Task] MongoDB create succeeded. Task ID: ${newTask._id}`);

    return {
      task: populatedTask,
      project,
      assignee,
    };
  } catch (err) {
    console.error(`[Task] MongoDB create failed: ${err.message}`);
    throw err;
  }
}

module.exports = {
  createTaskRecord,
};
