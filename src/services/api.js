/**
 * SiteVoice AEC — Frontend API Service
 * Handles communication exclusively with the existing backend API.
 * Includes token storage, role authorization headers, and multi-project support.
 */

const API_BASE = '/api';

/**
 * Token management in localStorage
 */
export function getAuthToken() {
  return localStorage.getItem('sitevoice_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('sitevoice_token', token);
  } else {
    localStorage.removeItem('sitevoice_token');
  }
}

/**
 * Common headers with Auth Bearer token
 */
function getHeaders(contentType = 'application/json') {
  const headers = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await handleResponse(res);
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getHeaders(null),
  });
  return handleResponse(res);
}

export async function switchUserSession({ userId, email, role }) {
  const res = await fetch(`${API_BASE}/auth/switch`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId, email, role }),
  });
  const data = await handleResponse(res);
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function logoutUser() {
  setAuthToken(null);
  return { success: true };
}

// -------------------------------------------------------------
// Projects Endpoints
// -------------------------------------------------------------

export async function getProjects() {
  const res = await fetch(`${API_BASE}/projects`, {
    headers: getHeaders(null),
  });
  return handleResponse(res);
}

export async function getProjectSummary(projectId) {
  if (!projectId) throw new Error('Project ID is required.');
  const res = await fetch(`${API_BASE}/projects/${projectId}/summary`, {
    headers: getHeaders(null),
  });
  return handleResponse(res);
}

export async function createProject(payload) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateProject(id, payload) {
  if (!id) throw new Error('Project ID is required.');
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function deleteProject(id) {
  if (!id) throw new Error('Project ID is required.');
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
    headers: getHeaders(null),
  });
  return handleResponse(res);
}

// -------------------------------------------------------------
// Snags (Problems) Endpoints
// -------------------------------------------------------------

export async function getSnags(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      query.append(key, String(val).trim());
    }
  });

  const url = query.toString() ? `${API_BASE}/snags?${query.toString()}` : `${API_BASE}/snags`;
  const res = await fetch(url, { headers: getHeaders(null) });
  return handleResponse(res);
}

export async function createSnag(payload) {
  const res = await fetch(`${API_BASE}/snags`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateSnag(id, updates) {
  if (!id) throw new Error('Problem ID is required.');
  const res = await fetch(`${API_BASE}/snags/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteSnag(id) {
  if (!id) throw new Error('Problem ID is required.');
  const res = await fetch(`${API_BASE}/snags/${id}`, {
    method: 'DELETE',
    headers: getHeaders(null),
  });
  return handleResponse(res);
}

// -------------------------------------------------------------
// Tasks Endpoints
// -------------------------------------------------------------

export async function getTasks(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      query.append(key, String(val).trim());
    }
  });

  const url = query.toString() ? `${API_BASE}/tasks?${query.toString()}` : `${API_BASE}/tasks`;
  const res = await fetch(url, { headers: getHeaders(null) });
  return handleResponse(res);
}

export async function getMyWork(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      query.append(key, String(val).trim());
    }
  });

  const url = query.toString() ? `${API_BASE}/tasks/my-work?${query.toString()}` : `${API_BASE}/tasks/my-work`;
  const res = await fetch(url, { headers: getHeaders(null) });
  return handleResponse(res);
}

export async function createTask(payload) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateTask(id, updates) {
  if (!id) throw new Error('Task ID is required.');
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function addTaskUpdate(taskId, text) {
  if (!taskId) throw new Error('Task ID is required.');
  const res = await fetch(`${API_BASE}/tasks/${taskId}/updates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

export async function deleteTask(id) {
  if (!id) throw new Error('Task ID is required.');
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers: getHeaders(null),
  });
  return handleResponse(res);
}

// -------------------------------------------------------------
// Team & Users Endpoints
// -------------------------------------------------------------

export async function getUsers() {
  const res = await fetch(`${API_BASE}/auth/users`, {
    headers: getHeaders(null),
  });
  return handleResponse(res);
}

export async function createUser(payload) {
  const res = await fetch(`${API_BASE}/auth/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateUser(id, payload) {
  const res = await fetch(`${API_BASE}/auth/users/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// -------------------------------------------------------------
// Voice & Action Execution
// -------------------------------------------------------------

export async function interpretVoice({ transcript, projectId }) {
  if (!transcript || !transcript.trim()) {
    throw new Error('Please speak or type a site command.');
  }

  const res = await fetch(`${API_BASE}/voice/interpret`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      transcript: transcript.trim(),
      projectId: projectId || undefined,
    }),
  });
  return handleResponse(res);
}

export async function executeAction({ actionType, projectId, payload }) {
  if (!actionType) throw new Error('Action type is required.');
  if (!projectId) throw new Error('Project ID is required.');

  const res = await fetch(`${API_BASE}/actions/execute`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ actionType, projectId, payload }),
  });
  return handleResponse(res);
}
