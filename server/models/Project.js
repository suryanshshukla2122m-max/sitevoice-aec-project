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
  status: {
    type: String,
    enum: ['Active', 'On Hold', 'Completed'],
    default: 'Active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Project', projectSchema);
