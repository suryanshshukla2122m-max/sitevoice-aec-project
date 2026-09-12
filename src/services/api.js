/**
 * SiteVoice AEC — Frontend API Service
 * Handles communication exclusively with the existing backend API.
 */

const API_BASE = '/api';

/**
 * Helper to process fetch responses and extract meaningful error messages.
 */
async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }
    return { success: true };
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/**
 * Health check
 */
export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}

/**
 * GET /api/projects
 */
export async function getProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  return handleResponse(res);
}

/**
 * GET /api/projects/:id/summary
 */
export async function getProjectSummary(projectId) {
  if (!projectId) throw new Error('Project ID is required.');
  const res = await fetch(`${API_BASE}/projects/${projectId}/summary`);
  return handleResponse(res);
}

/**
 * GET /api/snags
 * Optional query params: projectId, location, status, priority, assigneeId, search
 */
export async function getSnags(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      query.append(key, String(val).trim());
    }
  });

  const url = query.toString() ? `${API_BASE}/snags?${query.toString()}` : `${API_BASE}/snags`;
  const res = await fetch(url);
  return handleResponse(res);
}

/**
 * POST /api/snags
 */
export async function createSnag(payload) {
  const res = await fetch(`${API_BASE}/snags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

/**
 * GET /api/tasks
 * Optional query params: projectId, assigneeId, status, search
 */
export async function getTasks(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      query.append(key, String(val).trim());
    }
  });

  const url = query.toString() ? `${API_BASE}/tasks?${query.toString()}` : `${API_BASE}/tasks`;
  const res = await fetch(url);
  return handleResponse(res);
}

/**
 * POST /api/tasks
 */
export async function createTask(payload) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

/**
 * POST /api/voice/interpret
 * Main voice / typed interpretation pipeline.
 * @param {{ transcript: string, projectId?: string }} body
 */
export async function interpretVoice({ transcript, projectId }) {
  if (!transcript || !transcript.trim()) {
    throw new Error('Please speak or type a site command.');
  }

  const res = await fetch(`${API_BASE}/voice/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: transcript.trim(),
      projectId: projectId || undefined,
    }),
  });
  return handleResponse(res);
}

/**
 * POST /api/actions/execute
 * Executes user-confirmed write actions.
 * @param {{ actionType: string, projectId: string, payload: object }} body
 */
export async function executeAction({ actionType, projectId, payload }) {
  if (!actionType) throw new Error('Action type is required.');
  if (!projectId) throw new Error('Project ID is required.');

  const res = await fetch(`${API_BASE}/actions/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actionType, projectId, payload }),
  });
  return handleResponse(res);
}
