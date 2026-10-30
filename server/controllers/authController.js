const User = require('../models/User');
const Project = require('../models/Project');
const { createToken } = require('../utils/authUtil');

/**
 * POST /api/auth/login
 * User login with email & password.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).populate('assignedProjects', 'name code location');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `Account with email "${email}" not found.`,
      });
    }

    if (password && user.password && user.password !== password.trim()) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Default password for demo is "password123" or role-specific.',
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        phone: user.phone,
        assignedProjects: user.assignedProjects,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Returns currently logged in user profile.
 */
async function getMe(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'Not authenticated. Please log in.',
      });
    }

    const user = await User.findById(req.user._id)
      .populate('assignedProjects', 'name code location')
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: 'User session not found.',
      });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/switch
 * Quick role switcher for live presentation and testing.
 */
async function switchUser(req, res, next) {
  try {
    const { userId, email, role } = req.body;

    let user = null;
    if (userId) {
      user = await User.findById(userId).populate('assignedProjects', 'name code location');
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).populate('assignedProjects', 'name code location');
    } else if (role) {
      user = await User.findOne({ role: new RegExp(`^${role}$`, 'i') }).populate('assignedProjects', 'name code location');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Specified user could not be found for switching.',
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: `Switched active session to ${user.name} (${user.role})`,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        phone: user.phone,
        assignedProjects: user.assignedProjects,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/users
 * Lists all users with their roles and assigned projects.
 */
async function listUsers(req, res, next) {
  try {
    const users = await User.find({})
      .select('name email role company phone assignedProjects createdAt')
      .populate('assignedProjects', 'name code')
      .sort({ role: 1, name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/users
 * Admin adds new team member / contractor.
 */
async function createUser(req, res, next) {
  try {
    const { name, email, role, phone, company, assignedProjects, password = 'password123' } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and role are required to create a team member.',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A user with email "${email}" already exists.`,
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password.trim(),
      role: role.trim(),
      phone: phone ? phone.trim() : '',
      company: company ? company.trim() : '',
      assignedProjects: Array.isArray(assignedProjects) ? assignedProjects : [],
    });

    return res.status(201).json({
      success: true,
      message: `Team member ${user.name} created successfully.`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/auth/users/:id
 * Admin updates team member assignments or roles.
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, role, phone, company, assignedProjects } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (role) updates.role = role.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (company !== undefined) updates.company = company.trim();
    if (Array.isArray(assignedProjects)) updates.assignedProjects = assignedProjects;

    const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true })
      .populate('assignedProjects', 'name code')
      .lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe,
  switchUser,
  listUsers,
  createUser,
  updateUser,
};
