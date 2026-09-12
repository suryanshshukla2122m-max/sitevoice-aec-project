const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User/Contractor name is required'],
    trim: true,
  },
  role: {
    type: String,
    required: [true, 'Role/Trade is required'],
    trim: true,
    enum: [
      'Project Manager',
      'Site Engineer',
      'Electrical Contractor',
      'Plumbing Contractor',
      'False-Ceiling Contractor',
      'Civil Contractor',
      'HVAC Contractor',
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
