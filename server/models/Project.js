const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
  },
  code: {
    type: String,
    trim: true,
    default: '',
  },
  fullName: {
    type: String,
    trim: true,
    default: '',
  },
  location: {
    type: String,
    required: [true, 'Project location is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['Active', 'On Hold', 'Completed'],
    default: 'Active',
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  budget: {
    type: String,
    trim: true,
    default: '',
  },
  startDate: {
    type: Date,
    default: null,
  },
  targetDate: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Project', projectSchema);

