/**
 * Centralized human-readable error handler for Express.
 * Strictly prevents stack trace, internal secret, and credential leakage.
 */
function errorHandler(err, req, res, next) {
  // SyntaxError for malformed JSON in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload in request body.',
    });
  }

  // Mongoose CastError (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid identifier format for field "${err.path}".`,
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ') || 'Database validation failed.',
    });
  }

  // MongoDB connection / server selection timeout / network failure
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoNotConnectedError'
  ) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB database is currently unreachable. Please ensure the database service is running.',
    });
  }

  // Temporary AI service unavailability (HTTP 503)
  if (err.statusCode === 503 || err.isAiUnavailable) {
    return res.status(503).json({
      success: false,
      message: err.message || 'The AI service is temporarily experiencing high demand. Please wait a moment and try your command again.',
    });
  }

  // Missing GEMINI_MODEL error
  if (err.message && err.message.includes('GEMINI_MODEL')) {
    return res.status(500).json({
      success: false,
      message: 'AI speech interpretation service requires GEMINI_MODEL to be configured in the environment.',
    });
  }

  // Missing GEMINI_API_KEY or Gemini API client error
  if (err.message && err.message.includes('GEMINI_API_KEY')) {
    return res.status(500).json({
      success: false,
      message: 'AI speech interpretation service requires GEMINI_API_KEY to be configured in the environment.',
    });
  }

  if (err.message && (err.message.includes('Gemini API') || err.message.includes('GoogleGenAI'))) {
    return res.status(502).json({
      success: false,
      message: 'AI speech interpretation service returned an error. Please verify the Gemini model and credentials.',
    });
  }

  // Custom status code if attached
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = errorHandler;
