const mongoose = require('mongoose');

const snagSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project reference (projectId) is required'],
  },
  title: {
    type: String,
    required: [true, 'Snag title/issue is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Snag location is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open',
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Assignee reference (assigneeId) is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Snag', snagSchema);
