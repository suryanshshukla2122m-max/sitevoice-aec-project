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
 * Heuristically infers the relevant trade contractor from spoken keywords.
 * @param {string} text
 * @returns {string|null}
 */
function inferTradeAssignee(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes('ceiling')) return 'False-Ceiling Contractor';
  if (
    lower.includes('electr') ||
    lower.includes('wir') ||
    lower.includes('light') ||
    lower.includes('switch') ||
    lower.includes('conduit') ||
    lower.includes('power')
  ) {
    return 'Electrical Contractor';
  }
  if (
    lower.includes('plumb') ||
    lower.includes('pipe') ||
    lower.includes('leak') ||
    lower.includes('drain') ||
    lower.includes('faucet') ||
    lower.includes('valve') ||
    lower.includes('water')
  ) {
    return 'Plumbing Contractor';
  }
  if (
    lower.includes('civil') ||
    lower.includes('masonry') ||
    lower.includes('wall') ||
    lower.includes('paint') ||
    lower.includes('plaster') ||
    lower.includes('concrete') ||
    lower.includes('brick') ||
    lower.includes('tile') ||
    lower.includes('floor')
  ) {
    return 'Civil Contractor';
  }
  return null;
}

/**
 * Infers an AEC room or zone location from text.
 * @param {string} text
 * @returns {string}
 */
function inferLocation(text) {
  if (!text) return 'Site / General';
  const lower = text.toLowerCase();
  const rooms = [
    'master bathroom',
    'guest bathroom',
    'bathroom',
    'master bedroom',
    'bedroom 2',
    'bedroom 1',
    'bedroom',
    'living room',
    'kitchen',
    'dining room',
    'balcony',
    'terrace',
    'hallway',
    'corridor',
    'lobby',
    'basement',
    'staircase',
    'roof',
    'entrance',
    'exterior',
    'garage',
  ];
  for (const r of rooms) {
    if (lower.includes(r)) {
      return r
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  return 'Site / General';
}

/**
 * Deterministic fallback parser if AI model is temporarily busy (503/429) or times out.
 * Ensures critical site voice commands (create snag, create task, search) are never dropped.
 */
function fallbackParseTranscript(transcript, registeredUsers = []) {
  const text = (transcript || '').trim();

  // 1. Snag / Problem intent
  if (
    /\b(create|log|report|record|add|new)\b.*\b(snag|defect|punch|issue|problem)\b/i.test(text) ||
    /\b(problem|snag|defect)\b.*\b(master bathroom|ceiling|kitchen|bathroom|roof|wall|leak|crack|tile|door|window|switch)\b/i.test(text)
  ) {
    let title = '';
    const forMatch = text.match(/\b(?:for|with)\s+(.*?)(?:\s+(?:in|at|assigned to|to)\b|$)/i);
    if (forMatch && forMatch[1]) {
      title = forMatch[1].trim();
    } else {
      title = text.replace(/^(create|log|report|record|add|new)\s+(a\s+)?(snag|defect|punch\s+item|issue|problem)(\s+(?:for|with))?/i, '').trim();
    }

    const loc = inferLocation(text);
    const assignee = inferTradeAssignee(text) || 'Civil Contractor';

    return {
      intent: 'CREATE_SNAG',
      confidence: 0.95,
      entities: {
        title: title || 'Cracked bathroom tile',
        location: loc,
        priority: /high|critical|urgent/i.test(text) ? 'High' : 'Medium',
        assigneeName: assignee,
      },
      summary: `Report problem: ${title || 'Cracked bathroom tile'}`,
      spokenResponse: `I have prepared a problem report for "${title || 'Cracked bathroom tile'}" at ${loc}, assigned to ${assignee}. Please confirm to save.`,
    };
  }

  // 2. Task intent
  if (
    /\b(create|schedule|add|new)\b.*\b(task|job|work|inspection)\b/i.test(text) ||
    /\b(task)\b.*\b(checking|inspecting|fixing|electrical|wiring|plumbing|civil|painting)\b/i.test(text)
  ) {
    let title = '';
    const forMatch = text.match(/\b(?:for|to)\s+(.*?)(?:\s+(?:tomorrow|by|assigned to|to|at)\b|$)/i);
    if (forMatch && forMatch[1]) {
      title = forMatch[1].trim();
    } else {
      title = text.replace(/^(create|schedule|add|new)\s+(a\s+)?(task|job|work)(\s+(?:for|to))?/i, '').trim();
    }

    const assignee = inferTradeAssignee(text) || 'Site Engineer';
    const isTomorrow = /\btomorrow\b/i.test(text);

    return {
      intent: 'CREATE_TASK',
      confidence: 0.95,
      entities: {
        title: title || 'Inspect electrical wiring',
        dueDate: isTomorrow ? 'tomorrow' : null,
        assigneeName: assignee,
      },
      summary: `Create task: ${title || 'Inspect electrical wiring'}`,
      spokenResponse: `I have prepared the task "${title || 'Inspect electrical wiring'}" assigned to ${assignee}. Please confirm to save.`,
    };
  }

  // 3. Search snags / problems
  if (
    /\b(show|find|list|get|search|display)\b.*\b(snags?|defects?|problems?)\b/i.test(text) ||
    /\ball\s+(open\s+)?(snags|problems)\b/i.test(text) ||
    /\bopen\s+problems\b/i.test(text)
  ) {
    return {
      intent: 'SEARCH_SNAGS',
      confidence: 0.95,
      entities: {
        status: /\bopen\b/i.test(text) ? 'Open' : (/\b(resolved|closed)\b/i.test(text) ? 'Resolved' : null),
        location: inferLocation(text) !== 'Site / General' ? inferLocation(text) : null,
      },
      summary: 'Search problems in database',
      spokenResponse: 'Here are the matching problems from the project records.',
    };
  }

  // 4. Search tasks
  if (
    /\b(show|find|list|get|search|display)\b.*\b(tasks?|jobs?|work)\b/i.test(text) ||
    /\b(pending\s+tasks|all\s+tasks)\b/i.test(text)
  ) {
    return {
      intent: 'SEARCH_TASKS',
      confidence: 0.95,
      entities: {
        status: /\bpending\b/i.test(text) ? 'Pending' : (/\bcompleted\b/i.test(text) ? 'Completed' : null),
      },
      summary: 'Search tasks in database',
      spokenResponse: 'Here are the matching tasks from the project records.',
    };
  }

  // 5. Project status
  if (/\b(project status|status|progress|metrics|summary)\b/i.test(text)) {
    return {
      intent: 'PROJECT_STATUS',
      confidence: 0.95,
      entities: {},
      summary: 'Fetch overall project summary and status',
      spokenResponse: 'Calculating current project status and summary.',
    };
  }

  // 6. Unclear / Out of domain
  return {
    intent: 'NEED_CLARIFICATION',
    confidence: 0.2,
    entities: {},
    summary: 'Unclear command.',
    spokenResponse: 'I did not catch that clearly. You can say "Report a problem with bathroom tile", "Create a task to check wiring", "Show open problems", or "Show project status".',
  };
}

/**
 * POST /api/voice/interpret
 * Main voice-to-command interpretation pipeline.
 * Adheres strictly to: "Gemini Understands. Backend Decides. MongoDB Stores."
 */
async function interpretVoice(req, res, next) {
  try {
    const { transcript, projectId: reqProjectId } = req.body;

    // 1. Resolve active project context and registered team in parallel
    const { getActiveProject } = require('../services/projectService');
    const [project, registeredUsers] = await Promise.all([
      getActiveProject(reqProjectId),
      User.find({}).select('name role').lean(),
    ]);

    const projectId = project ? project._id.toString() : null;
    const projectName = project ? project.name : 'Skyline Residence';

    // 2. Call Gemini with structured instructions, with fallback if model is busy or times out
    let aiOutput;
    try {
      const prompt = buildPrompt(transcript, { projectName, registeredUsers });
      aiOutput = await generateStructuredContent(
        prompt,
        SYSTEM_INSTRUCTION,
        RESPONSE_SCHEMA
      );
    } catch (aiErr) {
      console.warn(`[VoiceController] AI error/unavailable (${aiErr.message}), using deterministic fallback.`);
      aiOutput = fallbackParseTranscript(transcript, registeredUsers);
    }

    const {
      intent = 'UNKNOWN',
      confidence = 0,
      entities = {},
      summary = '',
      spokenResponse = '',
    } = aiOutput;

    // Contextual intent refinement if model returned NEED_CLARIFICATION or UNKNOWN but command is explicit
    let finalIntent = intent;
    const transcriptLower = (transcript || '').toLowerCase();

    if (finalIntent === 'NEED_CLARIFICATION' || finalIntent === 'UNKNOWN') {
      if (
        /\b(create|log|report|record|add|new)\b.*\b(snag|defect|punch|issue|problem)\b/i.test(transcript) ||
        /\b(problem|snag|defect)\b.*\b(master bathroom|ceiling|kitchen|bathroom|roof|wall|tile|wiring|pipe|door)\b/i.test(transcript)
      ) {
        finalIntent = 'CREATE_SNAG';
      } else if (
        /\b(create|schedule|add|new)\b.*\b(task|job|work|inspection)\b/i.test(transcript) ||
        /\b(task)\b.*\b(checking|inspecting|fixing|electrical|wiring|plumbing|civil)\b/i.test(transcript)
      ) {
        finalIntent = 'CREATE_TASK';
      } else if (/\b(show|find|list|get|search|display)\b.*\b(snags?|defects?|problems?)\b/i.test(transcript) || /\bopen\s+problems\b/i.test(transcript)) {
        finalIntent = 'SEARCH_SNAGS';
      } else if (/\b(show|find|list|get|search|display)\b.*\b(tasks?|jobs?|work)\b/i.test(transcript) || /\bpending\s+tasks\b/i.test(transcript)) {
        finalIntent = 'SEARCH_TASKS';
      } else if (
        /\b(status|summary|progress|overview)\b.*\b(project)?\b/i.test(transcript) ||
        /\b(project status|project summary)\b/i.test(transcript)
      ) {
        finalIntent = 'PROJECT_STATUS';
      }
    }

    // 3. Handle WRITE Intents (CRITICAL: NEVER write to MongoDB directly in this route!)
    if (finalIntent === 'CREATE_SNAG') {
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot report a problem without an active project.',
        });
      }

      // Title resolution
      let title = (entities.title || '').trim();
      if (!title) {
        title = transcript
          .replace(/^(create|log|report|record|add|new)\s+(a\s+)?(snag|defect|punch\s+item|issue|problem)(\s+(?:for|with))?/i, '')
          .trim();
        if (!title) title = 'Site problem';
      }

      // Location resolution
      let location = (entities.location || '').trim();
      if (!location) {
        location = inferLocation(transcript + ' ' + title);
      }

      // Assignee resolution (explicit -> trade scope -> Site Engineer -> first user)
      let targetAssigneeName = entities.assigneeName;
      if (!targetAssigneeName) {
        targetAssigneeName = inferTradeAssignee(transcript + ' ' + title + ' ' + location);
      }
      if (!targetAssigneeName) {
        targetAssigneeName = 'Site Engineer';
      }

      let assigneeResult = await resolveAssignee(targetAssigneeName);
      if (!assigneeResult.resolved) {
        const tradeFallback = inferTradeAssignee(transcript + ' ' + title);
        if (tradeFallback) {
          assigneeResult = await resolveAssignee(tradeFallback);
        }
      }
      if (!assigneeResult.resolved) {
        assigneeResult = await resolveAssignee('Site Engineer');
      }
      if (!assigneeResult.resolved && registeredUsers.length > 0) {
        assigneeResult = { resolved: true, user: registeredUsers[0] };
      }

      if (!assigneeResult.resolved) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: 'Could not resolve contractor or person to assign this problem.',
          spokenResponse: 'Who should I assign this problem to? Please specify a contractor or team member.',
        });
      }

      // Priority whitelist
      const allowedPriorities = ['Low', 'Medium', 'High', 'Critical'];
      const priority = allowedPriorities.includes(entities.priority) ? entities.priority : 'Medium';

      // Construct verified pending action payload
      const pendingPayload = {
        title,
        location,
        priority,
        assigneeId: assigneeResult.user._id.toString(),
        assigneeName: `${assigneeResult.user.name} (${assigneeResult.user.role})`,
        description: `Logged via voice command on ${new Date().toLocaleDateString()}.`,
      };

      const customSpoken =
        spokenResponse && spokenResponse.length > 10
          ? spokenResponse
          : `I have prepared a ${pendingPayload.priority.toLowerCase()} priority problem for "${pendingPayload.title}" at ${pendingPayload.location}, assigned to ${assigneeResult.user.name}. Please confirm to save.`;

      return res.status(200).json({
        success: true,
        intent: 'CREATE_SNAG',
        confidence: confidence || 0.95,
        requiresConfirmation: true,
        pendingAction: {
          actionType: 'CREATE_SNAG',
          projectId,
          payload: pendingPayload,
        },
        summary: `Report problem "${pendingPayload.title}" at ${pendingPayload.location} → ${assigneeResult.user.name}`,
        spokenResponse: customSpoken,
      });
    }

    // 4. Handle WRITE Intent: CREATE_TASK
    if (finalIntent === 'CREATE_TASK') {
      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create a task without an active project.',
        });
      }

      // Title resolution
      let title = (entities.title || '').trim();
      if (!title) {
        title = transcript
          .replace(/^(create|schedule|add|new)\s+(a\s+)?(task|job|work)(\s+for)?/i, '')
          .trim();
        if (!title) title = 'Scheduled task';
      }

      // Assignee resolution (explicit -> trade scope -> Site Engineer -> first user)
      let targetAssigneeName = entities.assigneeName;
      if (!targetAssigneeName) {
        targetAssigneeName = inferTradeAssignee(transcript + ' ' + title);
      }
      if (!targetAssigneeName) {
        targetAssigneeName = 'Site Engineer';
      }

      let assigneeResult = await resolveAssignee(targetAssigneeName);
      if (!assigneeResult.resolved) {
        const tradeFallback = inferTradeAssignee(transcript + ' ' + title);
        if (tradeFallback) {
          assigneeResult = await resolveAssignee(tradeFallback);
        }
      }
      if (!assigneeResult.resolved) {
        assigneeResult = await resolveAssignee('Site Engineer');
      }
      if (!assigneeResult.resolved && registeredUsers.length > 0) {
        assigneeResult = { resolved: true, user: registeredUsers[0] };
      }

      if (!assigneeResult.resolved) {
        return res.status(200).json({
          success: true,
          intent: 'NEED_CLARIFICATION',
          confidence,
          requiresConfirmation: false,
          summary: 'Could not resolve contractor or assignee for this task.',
          spokenResponse: 'Who should I assign this task to? Please specify a contractor or team member.',
        });
      }

      // Due date resolution
      let parsedDueDate = null;
      const isTomorrow =
        /\btomorrow\b/i.test(transcript) ||
        (typeof entities.dueDate === 'string' && /\btomorrow\b/i.test(entities.dueDate));

      if (isTomorrow) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(17, 0, 0, 0);
        parsedDueDate = tomorrow.toISOString();
      } else if (entities.dueDate && entities.dueDate !== 'null') {
        const d = new Date(entities.dueDate);
        if (!isNaN(d.getTime())) {
          parsedDueDate = d.toISOString();
        }
      }

      const pendingPayload = {
        title,
        dueDate: parsedDueDate,
        assigneeId: assigneeResult.user._id.toString(),
        assigneeName: `${assigneeResult.user.name} (${assigneeResult.user.role})`,
        description: `Task created via voice command on ${new Date().toLocaleDateString()}.`,
      };

      const dateStr = parsedDueDate ? ` with deadline on ${new Date(parsedDueDate).toLocaleDateString()}` : '';
      const customSpoken =
        spokenResponse && spokenResponse.length > 10
          ? spokenResponse
          : `I have prepared the task "${pendingPayload.title}" assigned to ${assigneeResult.user.name}${dateStr}. Please confirm to save.`;

      return res.status(200).json({
        success: true,
        intent: 'CREATE_TASK',
        confidence: confidence || 0.95,
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

    // 5. Handle READ Intent: SEARCH_SNAGS
    if (finalIntent === 'SEARCH_SNAGS') {
      const filter = {};
      if (projectId) filter.projectId = projectId;

      if (entities.status) {
        const allowedStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
        const matched = allowedStatuses.find((s) => s.toLowerCase() === entities.status.toLowerCase());
        if (matched) filter.status = matched;
      } else if (/\bopen\b/i.test(transcript)) {
        filter.status = 'Open';
      } else if (/\b(resolved|closed)\b/i.test(transcript)) {
        filter.status = 'Resolved';
      }

      if (entities.location) {
        filter.location = { $regex: escapeRegex(entities.location), $options: 'i' };
      }

      if (entities.priority) {
        filter.priority = entities.priority;
      }

      if (entities.assigneeName) {
        const assigneeRes = await resolveAssignee(entities.assigneeName);
        if (assigneeRes.resolved) {
          filter.assigneeId = assigneeRes.user._id;
        }
      }

      const results = await Snag.find(filter)
        .populate('assigneeId', 'name role')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      let answer = spokenResponse;
      if (!answer || answer.length < 5 || answer.includes('could not find')) {
        const statusPart = filter.status ? ` ${filter.status.toLowerCase()}` : '';
        answer = `Found ${results.length}${statusPart} problem${results.length === 1 ? '' : 's'} in ${projectName}.`;
      }

      return res.status(200).json({
        success: true,
        intent: 'SEARCH_SNAGS',
        confidence: confidence || 0.95,
        requiresConfirmation: false,
        count: results.length,
        results,
        summary: `Found ${results.length} problems in database.`,
        spokenResponse: answer,
      });
    }

    // 6. Handle READ Intent: SEARCH_TASKS
    if (finalIntent === 'SEARCH_TASKS') {
      const filter = {};
      if (projectId) filter.projectId = projectId;

      if (entities.status) {
        const allowedStatuses = ['Pending', 'In Progress', 'Completed'];
        const matched = allowedStatuses.find((s) => s.toLowerCase() === entities.status.toLowerCase());
        if (matched) filter.status = matched;
      }

      if (/\b(my tasks|assigned to me|my work|what are my tasks)\b/i.test(transcript) && req.user) {
        filter.assigneeId = req.user._id;
      } else if (entities.assigneeName) {
        const assigneeRes = await resolveAssignee(entities.assigneeName);
        if (assigneeRes.resolved) {
          filter.assigneeId = assigneeRes.user._id;
        }
      }

      const results = await Task.find(filter)
        .populate('assigneeId', 'name role')
        .sort({ createdAt: -1 })
        .lean();

      let answer = spokenResponse;
      if (!answer || answer.length < 5) {
        const whoPart = filter.assigneeId && req.user && String(filter.assigneeId) === String(req.user._id)
          ? ' assigned to you'
          : entities.assigneeName
          ? ` for ${entities.assigneeName}`
          : '';
        answer = `Found ${results.length} task${results.length === 1 ? '' : 's'}${whoPart}.`;
      }

      return res.status(200).json({
        success: true,
        intent: 'SEARCH_TASKS',
        confidence: confidence || 0.95,
        requiresConfirmation: false,
        count: results.length,
        results,
        summary: `Found ${results.length} tasks in database.`,
        spokenResponse: answer,
      });
    }

    // 7. Handle READ Intent: PROJECT_STATUS
    if (finalIntent === 'PROJECT_STATUS') {
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

      const spoken = `Project status for ${projectName}: There are ${totalSnags} total problems with ${openSnags} currently open. You have ${totalTasks} total tasks with ${pendingTasks} pending.`;

      return res.status(200).json({
        success: true,
        intent: 'PROJECT_STATUS',
        confidence: confidence || 0.95,
        requiresConfirmation: false,
        metrics,
        summary: `Calculated project status for ${projectName}.`,
        spokenResponse: spoken,
      });
    }

    // 8. Fallback for unhandled or unclear command
    return res.status(200).json({
      success: true,
      intent: 'NEED_CLARIFICATION',
      confidence: confidence || 0.2,
      requiresConfirmation: false,
      summary: summary || 'Unclear command.',
      spokenResponse:
        spokenResponse && spokenResponse.length > 5
          ? spokenResponse
          : 'I did not catch that clearly. You can say "Report a problem with bathroom tile", "Create a task to check wiring", "Show open problems", or "Show project status".',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  interpretVoice,
};
