const Project = require('../models/Project');
const User = require('../models/User');
const Snag = require('../models/Snag');
const Task = require('../models/Task');
const { generateStructuredContent } = require('../config/gemini');
const { SYSTEM_INSTRUCTION, RESPONSE_SCHEMA, buildPrompt } = require('../utils/promptTemplates');
const { resolveAssignee, resolveProject } = require('../utils/entityResolver');

/**
 * Escapes regex special characters in a user-supplied string.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * POST /api/voice/interpret
 * Main voice-to-command interpretation pipeline.
 * Adheres strictly to: "Gemini Understands. Backend Decides. MongoDB Stores."
 */
async function interpretVoice(req, res, next) {
  try {
    const { transcript, projectId: reqProjectId } = req.body;

    // 1. Resolve active project context (Skyline Residence / SKY-204 for demo environment)
    const { getActiveProject } = require('../services/projectService');
    let targetProjectRef = reqProjectId;
    if (!targetProjectRef && typeof transcript === 'string') {
      const allProjects = await Project.find({}).lean();
      const transcriptLower = transcript.toLowerCase();
      for (const p of allProjects) {
        if (p.name && transcriptLower.includes(p.name.toLowerCase()) && p.name !== 'Skyline Residence') {
          targetProjectRef = p._id.toString();
          break;
        }
      }
    }
    const project = await getActiveProject(targetProjectRef);
    const projectId = project ? project._id.toString() : null;
    const projectName = project ? project.name : 'Skyline Residence';

    // 2. Fetch known team members & contractors for grounding
    const registeredUsers = await User.find({}).select('name role').lean();

    // 3. Call Gemini with structured instructions
    const prompt = buildPrompt(transcript, { projectName, registeredUsers });
    const aiOutput = await generateStructuredContent(
      prompt,
      SYSTEM_INSTRUCTION,
      RESPONSE_SCHEMA
    );

    const {
      intent = 'UNKNOWN',
      confidence = 0,
      entities = {},
      summary = '',
      spokenResponse = '',
    } = aiOutput;

    // 4. Validate allowed intent
    const allowedIntents = [
      'CREATE_SNAG',
      'CREATE_TASK',
      'SEARCH_SNAGS',
      'SEARCH_TASKS',
      'PROJECT_STATUS',
      'NEED_CLARIFICATION',
      'UNKNOWN',
    ];

    if (!allowedIntents.includes(intent)) {
      return res.status(200).json({
        success: true,
        intent: 'UNKNOWN',
        confidence: 0,
        requiresConfirmation: false,
        summary: 'Unrecognized action command.',
        spokenResponse: 'I did not recognize that command. Please try asking for project status, searching snags, or creating a snag.',
      });
    }

    // 5. Handle WRITE Intents (CRITICAL: NEVER write to MongoDB directly in this route!)
    if (intent === 'CREATE_SNAG') {
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create a snag without an active project.',
        });
      }

      // Check required entities
      if (!entities.title || !entities.location) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: 'Missing defect title or location for snag creation.',
          spokenResponse: 'Could you specify the exact location and defect issue for the snag?',
        });
      }

      // Resolve assignee
      if (!entities.assigneeName) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: 'Assignee not specified.',
          spokenResponse: 'Who should I assign this snag to? Please specify a contractor or team member.',
        });
      }

      const assigneeResult = await resolveAssignee(entities.assigneeName);
      if (!assigneeResult.resolved) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: assigneeResult.error,
          spokenResponse: `${assigneeResult.error} Please clarify who to assign.`,
        });
      }

      // Priority whitelist
      const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
      const priority = allowedPriorities.includes(entities.priority) ? entities.priority : 'Medium';

      // Construct verified pending action payload
      const pendingPayload = {
        title: entities.title.trim(),
        location: entities.location.trim(),
        priority,
        assigneeId: assigneeResult.user._id.toString(),
        assigneeName: `${assigneeResult.user.name} (${assigneeResult.user.role})`,
        description: `Logged via voice command on ${new Date().toLocaleDateString()}.`,
      };

      const customSpoken = `I understood: create a ${pendingPayload.priority.toLowerCase()} priority snag for "${pendingPayload.title}" at ${pendingPayload.location}, assigned to ${assigneeResult.user.name}. Please confirm to save.`;

      return res.status(200).json({
        success: true,
        intent: 'CREATE_SNAG',
        confidence,
        requiresConfirmation: true,
        pendingAction: {
          actionType: 'CREATE_SNAG',
          projectId,
          payload: pendingPayload,
        },
        summary: `Log snag "${pendingPayload.title}" at ${pendingPayload.location} → ${assigneeResult.user.name}`,
        spokenResponse: customSpoken,
      });
    }

    if (intent === 'CREATE_TASK') {
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create a task without an active project.',
        });
      }

      if (!entities.title) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: 'Missing task title.',
          spokenResponse: 'What task should I create? Please describe the task.',
        });
      }

      if (!entities.assigneeName) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: 'Assignee not specified.',
          spokenResponse: 'Who should I assign this task to?',
        });
      }

      const assigneeResult = await resolveAssignee(entities.assigneeName);
      if (!assigneeResult.resolved) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: assigneeResult.error,
          spokenResponse: `${assigneeResult.error} Please clarify who to assign.`,
        });
      }

      // Natural-language due date resolution relative to current runtime date
      let parsedDueDate = null;
      const isTomorrow =
        /\btomorrow\b/i.test(transcript) ||
        (typeof entities.dueDate === 'string' && /\btomorrow\b/i.test(entities.dueDate));

      if (isTomorrow) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(17, 0, 0, 0);
        parsedDueDate = tomorrow.toISOString();
      } else if (entities.dueDate) {
        const d = new Date(entities.dueDate);
        if (!isNaN(d.getTime())) {
          parsedDueDate = d.toISOString();
        }
      }

      const pendingPayload = {
        title: entities.title.trim(),
        dueDate: parsedDueDate,
        assigneeId: assigneeResult.user._id.toString(),
        assigneeName: `${assigneeResult.user.name} (${assigneeResult.user.role})`,
        description: `Scheduled via voice command on ${new Date().toLocaleDateString()}.`,
      };

      const dateStr = parsedDueDate ? ` by ${new Date(parsedDueDate).toLocaleDateString()}` : '';
      const customSpoken = `I understood: create task "${pendingPayload.title}"${dateStr} assigned to ${assigneeResult.user.name}. Please confirm to save.`;

      return res.status(200).json({
        success: true,
        intent: 'CREATE_TASK',
        confidence,
        requiresConfirmation: true,
        pendingAction: {
          actionType: 'CREATE_TASK',
          projectId,
          payload: pendingPayload,
        },
        summary: `Create task "${pendingPayload.title}" → ${assigneeResult.user.name}`,
        spokenResponse: customSpoken,
      });
    }

    // 6. Handle READ Intents (Execute controlled, safe Mongoose queries)
    if (intent === 'SEARCH_SNAGS') {
      const filter = {};
      if (projectId) {
        filter.projectId = projectId;
      }
      if (entities.location) {
        filter.location = new RegExp(escapeRegex(entities.location.trim()), 'i');
      }
      if (entities.status) {
        const allowedStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        const matchedStatus = allowedStatuses.find((s) => s.toLowerCase() === entities.status.trim().toLowerCase());
        if (matchedStatus) {
          filter.status = matchedStatus;
        }
      }
      if (entities.priority) {
        const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
        const matchedPriority = allowedPriorities.find((p) => p.toLowerCase() === entities.priority.trim().toLowerCase());
        if (matchedPriority) {
          filter.priority = matchedPriority;
        }
      }
      if (entities.assigneeName) {
        const userMatch = await resolveAssignee(entities.assigneeName);
        if (userMatch.resolved) {
          filter.assigneeId = userMatch.user._id;
        }
      }

      const results = await Snag.find(filter)
        .populate('assigneeId', 'name role')
        .sort({ createdAt: -1 })
        .lean();

      let answer = spokenResponse;
      if (!answer || answer.length < 5) {
        const locPart = entities.location ? ` in ${entities.location}` : '';
        const statPart = entities.status ? ` ${entities.status.toLowerCase()}` : '';
        answer = `I found ${results.length}${statPart} snag${results.length === 1 ? '' : 's'}${locPart}.`;
      }

      return res.status(200).json({
        success: true,
        intent: 'SEARCH_SNAGS',
        confidence,
        requiresConfirmation: false,
        count: results.length,
        results,
        summary: `Retrieved ${results.length} snags from database.`,
        spokenResponse: answer,
      });
    }

    if (intent === 'SEARCH_TASKS') {
      const filter = {};
      if (projectId) {
        filter.projectId = projectId;
      }
      if (entities.status) {
        const allowedStatuses = ['Pending', 'In Progress', 'Completed'];
        const matchedStatus = allowedStatuses.find((s) => s.toLowerCase() === entities.status.trim().toLowerCase());
        if (matchedStatus) {
          filter.status = matchedStatus;
        }
      }
      if (entities.assigneeName) {
        const userMatch = await resolveAssignee(entities.assigneeName);
        if (userMatch.resolved) {
          filter.assigneeId = userMatch.user._id;
        }
      }

      const results = await Task.find(filter)
        .populate('assigneeId', 'name role')
        .sort({ createdAt: -1 })
        .lean();

      let answer = spokenResponse;
      if (!answer || answer.length < 5) {
        const whoPart = entities.assigneeName ? ` for ${entities.assigneeName}` : '';
        answer = `Found ${results.length} task${results.length === 1 ? '' : 's'}${whoPart}.`;
      }

      return res.status(200).json({
        success: true,
        intent: 'SEARCH_TASKS',
        confidence,
        requiresConfirmation: false,
        count: results.length,
        results,
        summary: `Retrieved ${results.length} tasks from database.`,
        spokenResponse: answer,
      });
    }

    if (intent === 'PROJECT_STATUS') {
      const filter = projectId ? { projectId } : {};
      const [
        totalSnags,
        openSnags,
        resolvedSnags,
        totalTasks,
        pendingTasks,
        completedTasks,
      ] = await Promise.all([
        Snag.countDocuments(filter),
        Snag.countDocuments({ ...filter, status: 'Open' }),
        Snag.countDocuments({ ...filter, status: { $in: ['Resolved', 'Closed'] } }),
        Task.countDocuments(filter),
        Task.countDocuments({ ...filter, status: 'Pending' }),
        Task.countDocuments({ ...filter, status: 'Completed' }),
      ]);

      const now = new Date();
      const overdueTasks = await Task.countDocuments({
        ...filter,
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

      const spoken = `Project status for ${projectName}: There are ${totalSnags} total snags with ${openSnags} currently open. You have ${totalTasks} total tasks with ${pendingTasks} pending.`;

      return res.status(200).json({
        success: true,
        intent: 'PROJECT_STATUS',
        confidence,
        requiresConfirmation: false,
        metrics,
        summary: `Calculated status metrics for ${projectName}.`,
        spokenResponse: spoken,
      });
    }

    // 7. Fallback for NEED_CLARIFICATION or UNKNOWN
    return res.status(200).json({
      success: true,
      intent,
      confidence,
      requiresConfirmation: false,
      summary,
      spokenResponse:
        spokenResponse ||
        'I could not determine the requested action. You can ask to create a snag, create a task, search snags, or check project status.',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  interpretVoice,
};
