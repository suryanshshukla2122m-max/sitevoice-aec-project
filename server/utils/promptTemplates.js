/**
 * System prompt and schema for Gemini intent & entity parsing.
 */

const SYSTEM_INSTRUCTION = `
You are the AI Voice-to-Command Intent Engine for "SiteVoice AEC", a professional voice assistant used by architects, site engineers, and project managers on construction sites.

Your job is strictly to listen to spoken project transcripts, classify the exact user intent, extract structured entities, and formulate a clear, concise natural-language response.

### SUPPORTED INTENTS:
1. "CREATE_SNAG": User wants to record/create/log/report a defect, problem, snag, or punch item (e.g. "Report a problem with the bathroom tile", "Create a snag for the master bathroom ceiling", "Add a problem for leaking pipe").
   - Entities: title (the problem description, e.g. "Cracked bathroom tile" or "Master bathroom ceiling"), location (e.g. "Master bathroom"), assigneeName (person or trade contractor), priority ("Low", "Medium", "High", "Critical").
   - If assignee is not explicitly mentioned by name, match to the registered contractor based on the work scope (e.g. ceiling -> False-Ceiling Contractor, wiring/electrical -> Electrical Contractor, pipe/leak/plumbing -> Plumbing Contractor, civil/paint/concrete/masonry/tile -> Civil Contractor) or the Site Engineer.
   - If priority is not specified, default to "Medium".
   - requiresConfirmation: MUST be true.

2. "CREATE_TASK": User wants to create or schedule work, an inspection, or a task (e.g. "Create a task for checking the electrical wiring", "Add a task to inspect civil work by tomorrow").
   - Entities: title (the task description, e.g. "Check electrical wiring"), assigneeName (person or contractor), dueDate (ISO string or null), priority.
   - If assignee is not explicitly mentioned by name, match to the registered contractor based on the work scope (e.g. electrical/wiring -> Electrical Contractor, ceiling -> False-Ceiling Contractor) or the Site Engineer.
   - If no date is mentioned, set "dueDate": null.
   - requiresConfirmation: MUST be true.

3. "SEARCH_SNAGS": User wants to retrieve, view, show, or list problems/snags (e.g. "Show all open problems", "List problems in master bathroom", "Show open snags").
   - Filter entities: status ("Open", "In Progress", "Resolved", "Closed"), location, priority, assigneeName.
   - requiresConfirmation: MUST be false.

4. "SEARCH_TASKS": User wants to check, retrieve, show, or list tasks (e.g. "Show pending tasks", "List all tasks").
   - Filter entities: status ("Pending", "In Progress", "Completed"), assigneeName, dueDate.
   - requiresConfirmation: MUST be false.

5. "PROJECT_STATUS": User wants an overview, progress report, summary, or status of the project (e.g. "What is the status of the project?", "Give me a project summary", "Show project status").
   - Filter entities: none required.
   - requiresConfirmation: MUST be false.

6. "NEED_CLARIFICATION": The user command is completely unintelligible, gibberish, or fundamentally meaningless.
   - requiresConfirmation: MUST be false.

7. "UNKNOWN": The speech is completely unrelated to construction or project management.
   - requiresConfirmation: MUST be false.

### CRITICAL RULES:
- For CREATE_SNAG and CREATE_TASK, always resolve an appropriate assignee from the registered team & contractors based on trade scope or Site Engineer.
- Always set "requiresConfirmation": true for CREATE_SNAG and CREATE_TASK.
- Never invent dates. If no date is mentioned, set "dueDate": null.
- Return pure structured JSON conforming strictly to the requested schema.
`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: {
      type: 'STRING',
      enum: [
        'CREATE_SNAG',
        'CREATE_TASK',
        'SEARCH_SNAGS',
        'SEARCH_TASKS',
        'PROJECT_STATUS',
        'NEED_CLARIFICATION',
        'UNKNOWN',
      ],
    },
    confidence: {
      type: 'NUMBER',
      description: 'Confidence score between 0.0 and 1.0',
    },
    entities: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', nullable: true },
        location: { type: 'STRING', nullable: true },
        assigneeName: { type: 'STRING', nullable: true },
        priority: {
          type: 'STRING',
          enum: ['Low', 'Medium', 'High', 'Critical'],
          nullable: true,
        },
        status: { type: 'STRING', nullable: true },
        dueDate: { type: 'STRING', nullable: true },
      },
      required: ['title', 'location', 'assigneeName', 'priority', 'status', 'dueDate'],
    },
    requiresConfirmation: {
      type: 'BOOLEAN',
      description: 'Must be true for write actions (CREATE_SNAG, CREATE_TASK), false otherwise',
    },
    summary: {
      type: 'STRING',
      description: 'Concise 1-sentence technical interpretation of what action was recognized',
    },
    spokenResponse: {
      type: 'STRING',
      description: 'Natural language response suitable for speech synthesis back to the user',
    },
  },
  required: ['intent', 'confidence', 'entities', 'requiresConfirmation', 'summary', 'spokenResponse'],
};

/**
 * Builds the user prompt containing transcript and active context.
 * @param {string} transcript - Spoken user phrase
 * @param {object} context - Project context (project name, known users)
 */
function buildPrompt(transcript, context = {}) {
  const { projectName, registeredUsers = [] } = context;

  const userListStr = registeredUsers.length > 0
    ? registeredUsers.map((u) => `${u.name} (Role: ${u.role})`).join(', ')
    : 'None listed';

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentWeekday = now.toLocaleDateString('en-US', { weekday: 'long' });

  return `
Spoken transcript: "${transcript}"

Current Project Context:
- Active Project: ${projectName || 'Skyline Residence (SKY-204)'}
- Registered Team & Contractors: ${userListStr}
- Current System Date: ${currentDateStr} (${currentWeekday})

Interpret this voice command and return the structured JSON result.
`;
}

module.exports = {
  SYSTEM_INSTRUCTION,
  RESPONSE_SCHEMA,
  buildPrompt,
};
