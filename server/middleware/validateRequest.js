const mongoose = require('mongoose');

/**
 * Validates if a string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  if (!id) return false;
  const str = typeof id === 'string' ? id : String(id);
  return typeof str === 'string' && mongoose.Types.ObjectId.isValid(str) && String(new mongoose.Types.ObjectId(str)) === str;
}

/**
 * Validates non-empty string.
 * @param {any} val
 * @returns {boolean}
 */
function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Middleware: Validates voice interpretation request payload.
 */
function validateVoiceInterpretRequest(req, res, next) {
  const { transcript, projectId } = req.body || {};

  if (!isNonEmptyString(transcript)) {
    return res.status(400).json({
      success: false,
      message: 'Transcript is required and must be a non-empty string.',
    });
  }

  if (transcript.length > 500) {
    return res.status(400).json({
      success: false,
      message: 'Transcript exceeds maximum allowed length of 500 characters.',
    });
  }

  if (projectId && !isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Provided projectId is not a valid MongoDB ObjectId.',
    });
  }

  next();
}

/**
 * Middleware: Validates action execution request payload.
 */
function validateActionExecuteRequest(req, res, next) {
  const { actionType, projectId, payload } = req.body || {};

  const allowedActions = ['CREATE_SNAG', 'CREATE_TASK'];
  if (!allowedActions.includes(actionType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid actionType "${actionType}". Allowed actions: ${allowedActions.join(', ')}.`,
    });
  }

  if (projectId && !isValidObjectId(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Provided projectId is not a valid MongoDB ObjectId.',
    });
  }

  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'Payload object is required for action execution.',
    });
  }

  if (actionType === 'CREATE_SNAG') {
    if (!isNonEmptyString(payload.title)) {
      return res.status(400).json({
        success: false,
        message: 'Snag title is required in payload.',
      });
    }
    if (!isNonEmptyString(payload.location)) {
      return res.status(400).json({
        success: false,
        message: 'Snag location is required in payload.',
      });
    }
    if (!isValidObjectId(payload.assigneeId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid assigneeId (MongoDB ObjectId) is required for snag creation.',
      });
    }
    if (payload.priority && !['Low', 'Medium', 'High', 'Critical'].includes(payload.priority)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid snag priority. Allowed: Low, Medium, High, Critical.',
      });
    }
  }

  if (actionType === 'CREATE_TASK') {
    if (!isNonEmptyString(payload.title)) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required in payload.',
      });
    }
    if (!isValidObjectId(payload.assigneeId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid assigneeId (MongoDB ObjectId) is required for task creation.',
      });
    }
  }

  next();
}

/**
 * Middleware: Validates snag creation request payload (direct POST).
 */
function validateSnagCreate(req, res, next) {
  const { projectId, title, location, assigneeId, priority } = req.body || {};

  if (projectId && !isValidObjectId(projectId)) {
    return res.status(400).json({ success: false, message: 'Valid projectId is required.' });
  }
  if (!isNonEmptyString(title)) {
    return res.status(400).json({ success: false, message: 'Snag title is required.' });
  }
  if (!isNonEmptyString(location)) {
    return res.status(400).json({ success: false, message: 'Snag location is required.' });
  }
  if (!isValidObjectId(assigneeId)) {
    return res.status(400).json({ success: false, message: 'Valid assigneeId is required.' });
  }
  if (priority && !['Low', 'Medium', 'High', 'Critical'].includes(priority)) {
    return res.status(400).json({ success: false, message: 'Invalid priority level.' });
  }

  next();
}

/**
 * Middleware: Validates task creation request payload (direct POST).
 */
function validateTaskCreate(req, res, next) {
  const { projectId, title, assigneeId } = req.body || {};

  if (projectId && !isValidObjectId(projectId)) {
    return res.status(400).json({ success: false, message: 'Valid projectId is required.' });
  }
  if (!isNonEmptyString(title)) {
    return res.status(400).json({ success: false, message: 'Task title is required.' });
  }
  if (!isValidObjectId(assigneeId)) {
    return res.status(400).json({ success: false, message: 'Valid assigneeId is required.' });
  }

  next();
}

module.exports = {
  isValidObjectId,
  isNonEmptyString,
  validateVoiceInterpretRequest,
  validateActionExecuteRequest,
  validateSnagCreate,
  validateTaskCreate,
};
