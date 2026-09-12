const mongoose = require('mongoose');
const User = require('../models/User');
const Project = require('../models/Project');

/**
 * Normalizes a string for safe comparison (lowercased, trimmed, trimmed punctuation).
 * @param {string} str
 * @returns {string}
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves an assignee name or trade against the User collection.
 * Uses safe matching without wild uncontrolled fuzzy guessing.
 *
 * @param {string} assigneeText - Spoken name or trade (e.g. "Rahul", "False-Ceiling Contractor")
 * @returns {Promise<{ resolved: boolean, user?: object, ambiguous?: boolean, candidates?: object[], error?: string }>}
 */
async function resolveAssignee(assigneeText) {
  if (!assigneeText || typeof assigneeText !== 'string' || !assigneeText.trim()) {
    return {
      resolved: false,
      ambiguous: false,
      error: 'No assignee name or trade was specified.',
    };
  }

  const normalizedQuery = normalizeString(assigneeText);
  const users = await User.find({}).lean();

  if (!users || users.length === 0) {
    return {
      resolved: false,
      ambiguous: false,
      error: 'No registered contractors or team members exist in the system.',
    };
  }

  // Pass 1: Exact name match (case-insensitive)
  const exactNameMatches = users.filter(
    (u) => normalizeString(u.name) === normalizedQuery
  );
  if (exactNameMatches.length === 1) {
    return { resolved: true, user: exactNameMatches[0] };
  }
  if (exactNameMatches.length > 1) {
    return {
      resolved: false,
      ambiguous: true,
      candidates: exactNameMatches,
      error: `Multiple users found matching name "${assigneeText}". Please specify the full name or trade.`,
    };
  }

  // Pass 2: Exact role/trade match (case-insensitive)
  const exactRoleMatches = users.filter(
    (u) => normalizeString(u.role) === normalizedQuery
  );
  if (exactRoleMatches.length === 1) {
    return { resolved: true, user: exactRoleMatches[0] };
  }
  if (exactRoleMatches.length > 1) {
    return {
      resolved: false,
      ambiguous: true,
      candidates: exactRoleMatches,
      error: `Multiple contractors found registered under trade "${assigneeText}". Please specify which contractor.`,
    };
  }

  // Pass 3: Safe partial containment (e.g., user said "Rahul" and user is "Rahul Sharma",
  // or user said "false ceiling" and role is "False-Ceiling Contractor")
  const partialMatches = users.filter((u) => {
    const normName = normalizeString(u.name);
    const normRole = normalizeString(u.role);

    // Either name starts with query or contains query as a distinct token
    const nameTokens = normName.split(' ');
    const queryTokens = normalizedQuery.split(' ');

    const nameMatch = queryTokens.every((token) => normName.includes(token));
    const roleMatch = queryTokens.every((token) => normRole.includes(token));

    return nameMatch || roleMatch;
  });

  if (partialMatches.length === 1) {
    return { resolved: true, user: partialMatches[0] };
  }
  if (partialMatches.length > 1) {
    return {
      resolved: false,
      ambiguous: true,
      candidates: partialMatches,
      error: `Ambiguous assignee "${assigneeText}". Matches: ${partialMatches.map((u) => `${u.name} (${u.role})`).join(', ')}.`,
    };
  }

  // Pass 4: Unresolved
  return {
    resolved: false,
    ambiguous: false,
    error: `Could not find any registered team member or contractor matching "${assigneeText}".`,
  };
}

/**
 * Resolves a Project by ID or name.
 *
 * @param {string} projectIdOrName
 * @returns {Promise<{ resolved: boolean, project?: object, error?: string }>}
 */
async function resolveProject(projectIdOrName) {
  if (!projectIdOrName || typeof projectIdOrName !== 'string') {
    return { resolved: false, error: 'Project ID or name is required.' };
  }

  const trimmed = projectIdOrName.trim();

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const project = await Project.findById(trimmed).lean();
    if (project) {
      return { resolved: true, project };
    }
  }

  // Check matching by code, name, or fullName
  const normalized = normalizeString(trimmed);
  const projects = await Project.find({}).lean();
  const matched = projects.find((p) => {
    return (
      normalizeString(p.name) === normalized ||
      (p.code && normalizeString(p.code) === normalized) ||
      (p.fullName && normalizeString(p.fullName) === normalized)
    );
  });

  if (matched) {
    return { resolved: true, project: matched };
  }

  // Check if query matches demo project keywords (e.g. "skyline", "sky-204", "sky204")
  if (
    normalized.includes('skyline') ||
    normalized.includes('sky 204') ||
    normalized.includes('sky204')
  ) {
    const { getOrEnsureDemoProject } = require('../services/projectService');
    const demoProject = await getOrEnsureDemoProject();
    if (demoProject) {
      return { resolved: true, project: demoProject.toObject ? demoProject.toObject() : demoProject };
    }
  }

  return { resolved: false, error: `Project "${projectIdOrName}" not found.` };
}

module.exports = {
  normalizeString,
  resolveAssignee,
  resolveProject,
};
