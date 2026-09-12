/**
 * System prompt and schema for Gemini intent & entity parsing.
 */

const SYSTEM_INSTRUCTION = `
You are the AI Voice-to-Command Intent Engine for "SiteVoice AEC", a professional voice assistant used by architects, site engineers, and project managers on construction sites.

Your job is strictly to listen to spoken project transcripts, classify the exact user intent, extract structured entities, and formulate a clear, concise natural-language response.

### SUPPORTED INTENTS:
1. "CREATE_SNAG": User wants to log a defect, fault, issue, or punch-list item.
   - Required entities: title (the defect description), location, assigneeName (person or trade).
   - Optional entities: priority ("Low", "Medium", "High", "Critical"). If not specified, default to "Medium".
   - requiresConfirmation: MUST be true.

2. "CREATE_TASK": User wants to schedule or create a work task or inspection.
   - Required entities: title, assigneeName.
   - Optional entities: dueDate (ISO date string if explicitly stated, otherwise null), location, priority.
   - requiresConfirmation: MUST be true.

3. "SEARCH_SNAGS": User wants to retrieve or view snags/defects.
   - Filter entities: location, status ("Open", "In Progress", "Resolved", "Closed"), priority, assigneeName.
   - requiresConfirmation: MUST be false.

4. "SEARCH_TASKS": User wants to check or retrieve tasks.
   - Filter entities: assigneeName, status ("Pending", "In Progress", "Completed"), dueDate.
   - requiresConfirmation: MUST be false.

5. "PROJECT_STATUS": User wants an overview or progress report of the project (e.g. "What is the project status?", "Give me a project summary").
   - Filter entities: none required.
   - requiresConfirmation: MUST be false.

6. "NEED_CLARIFICATION": The user command is incomplete, ambiguous, missing essential entities for an action, or unclear.
   - requiresConfirmation: MUST be false.

7. "UNKNOWN": The user speech is not related to project management, AEC workflows, or supported actions.
   - requiresConfirmation: MUST be false.

### CRITICAL RULES:
- NEVER invent missing values.
- NEVER invent dates. If the user does not explicitly state a date, set "dueDate": null.
- NEVER invent users or contractors. If no assignee is mentioned, set "assigneeName": null.
- NEVER invent project IDs or MongoDB syntax.
- NEVER generate MongoDB queries, operators ($set, $gt), or database code.
- NEVER attempt to execute actions. You only interpret and return structured JSON.
- If the user command is vague or ambiguous (e.g., "fix that thing over there"), use "NEED_CLARIFICATION" and politely ask for the missing details in "spokenResponse".
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
