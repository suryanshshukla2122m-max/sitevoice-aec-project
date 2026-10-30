const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User/Contractor name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    default: 'password123',
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    trim: true,
    enum: [
      'Admin',
      'Project Manager',
      'Site Engineer',
      'Electrical Contractor',
      'Plumbing Contractor',
      'False-Ceiling Contractor',
      'Civil Contractor',
      'HVAC Contractor',
    ],
    default: 'Site Engineer',
  },
  assignedProjects: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
  ],
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  company: {
    type: String,
    trim: true,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);

