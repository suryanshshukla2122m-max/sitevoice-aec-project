const User = require('../models/User');
const { verifyToken } = require('../utils/authUtil');

/**
 * Extracts and populates req.user from Bearer token or fallback user headers.
 */
async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.userId) {
        const user = await User.findById(payload.userId).lean();
        if (user) {
          req.user = user;
          return next();
        }
      }
    }

    // Support dev/presentation fallback via x-user-id or x-user-email
    const fallbackId = req.headers['x-user-id'];
    const fallbackEmail = req.headers['x-user-email'];

    if (fallbackId) {
      const user = await User.findById(fallbackId).lean();
      if (user) {
        req.user = user;
        return next();
      }
    }

    if (fallbackEmail) {
      const user = await User.findOne({ email: fallbackEmail.toLowerCase() }).lean();
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Default to admin or first user if unauthenticated in non-strict modes
    req.user = null;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware requiring authenticated user.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in to access this resource.',
    });
  }
  next();
}

/**
 * Middleware requiring specific role(s). Admin always passes.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.role === 'Admin') {
      return next(); // Admin has universal access
    }

    const normalizedRoles = roles.map((r) => r.toLowerCase());
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    const isMatch = normalizedRoles.some((allowed) => {
      if (allowed === 'worker' || allowed === 'contractor') {
        return (
          userRole.includes('contractor') ||
          userRole.includes('engineer') ||
          userRole === 'site engineer'
        );
      }
      return userRole === allowed || userRole.includes(allowed);
    });

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}]. Current role: ${req.user.role}`,
      });
    }

    next();
  };
}

/**
 * Checks if user is authorized for specific projectId.
 */
function checkProjectAccess(user, projectId) {
  if (!user || !projectId) return false;
  if (user.role === 'Admin') return true;

  if (Array.isArray(user.assignedProjects)) {
    const projStr = String(projectId);
    const hasAssigned = user.assignedProjects.some((p) => String(p._id || p) === projStr);
    if (hasAssigned) return true;
  }

  return false;
}

module.exports = {
  authenticate,
  requireAuth,
  requireRole,
  checkProjectAccess,
};
