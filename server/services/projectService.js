const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Snag = require('../models/Snag');
const Task = require('../models/Task');

const DEMO_PROJECT_CONFIG = {
  name: 'Skyline Residence',
  code: 'SKY-204',
  fullName: 'Skyline Luxury Residence, Phase 2',
  location: 'Sector 150, Expressway, Noida',
  status: 'Active',
};

const DEFAULT_TEAM_MEMBERS = [
  { name: 'Rahul Sharma', role: 'Site Engineer' },
  { name: 'Priya Mehta', role: 'Project Manager' },
  { name: 'Apex Ceilings', role: 'False-Ceiling Contractor' },
  { name: 'BrightSpark Electricals', role: 'Electrical Contractor' },
  { name: 'FluidFlow Plumbing', role: 'Plumbing Contractor' },
  { name: 'BuildCraft Civil', role: 'Civil Contractor' },
];

/**
 * Normalizes text for safe comparison.
 */
function normalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Ensures the demo project (Skyline Residence / SKY-204) exists in MongoDB.
 * Uses atomic upsert / find-or-create logic to prevent duplicate documents.
 * @returns {Promise<Document>} The Mongoose project document
 */
async function getOrEnsureDemoProject() {
  // 1. Attempt to find existing project by code, name, or full name
  let project = await Project.findOne({
    $or: [
      { code: DEMO_PROJECT_CONFIG.code },
      { name: DEMO_PROJECT_CONFIG.name },
      { fullName: DEMO_PROJECT_CONFIG.fullName },
    ],
  });

  if (project) {
    let modified = false;
    if (!project.code) {
      project.code = DEMO_PROJECT_CONFIG.code;
      modified = true;
    }
    if (!project.fullName) {
      project.fullName = DEMO_PROJECT_CONFIG.fullName;
      modified = true;
    }
    if (project.status !== 'Active') {
      project.status = 'Active';
      modified = true;
    }
    if (modified) {
      await project.save();
    }
    return project;
  }

  // 2. Atomic find-or-create with upsert to prevent race conditions & duplicates
  project = await Project.findOneAndUpdate(
    {
      $or: [
        { code: DEMO_PROJECT_CONFIG.code },
        { name: DEMO_PROJECT_CONFIG.name },
        { fullName: DEMO_PROJECT_CONFIG.fullName },
      ],
    },
    {
      $setOnInsert: {
        name: DEMO_PROJECT_CONFIG.name,
        code: DEMO_PROJECT_CONFIG.code,
        fullName: DEMO_PROJECT_CONFIG.fullName,
        location: DEMO_PROJECT_CONFIG.location,
        status: DEMO_PROJECT_CONFIG.status,
      },
    },
    {
      returnDocument: 'after',
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log(
    `[Project] Initialized demo project: "${project.name}" (${project.code || DEMO_PROJECT_CONFIG.code}) [ID: ${project._id}]`
  );
  return project;
}

/**
 * Ensures demo team members exist in the User collection so assignee resolution succeeds.
 */
async function ensureDemoUsers() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.insertMany(DEFAULT_TEAM_MEMBERS);
    console.log(`[Users] Seeded ${DEFAULT_TEAM_MEMBERS.length} default AEC team members and contractors.`);
  }
}

/**
 * Ensures demo data (project, users, initial snags & tasks) are present.
 */
async function ensureDemoData() {
  const project = await getOrEnsureDemoProject();
  await ensureDemoUsers();

  const snagCount = await Snag.countDocuments({ projectId: project._id });
  const taskCount = await Task.countDocuments({ projectId: project._id });

  if (snagCount === 0 && taskCount === 0) {
    const users = await User.find({}).lean();
    const userMap = {};
    users.forEach((u) => {
      userMap[u.name] = u._id;
      userMap[u.role] = u._id;
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    const inFiveDays = new Date();
    inFiveDays.setDate(inFiveDays.getDate() + 5);

    await Snag.insertMany([
      {
        projectId: project._id,
        title: 'Master bathroom ceiling dampness',
        description: 'Minor moisture seepage detected near outer gypsum joint.',
        location: 'Master Bathroom',
        status: 'Open',
        priority: 'High',
        assigneeId: userMap['Apex Ceilings'] || users[0]._id,
      },
      {
        projectId: project._id,
        title: 'Balcony railing paint chipping',
        description: 'Primer exposed on east railing baluster.',
        location: 'Balcony',
        status: 'Open',
        priority: 'Low',
        assigneeId: userMap['BuildCraft Civil'] || users[0]._id,
      },
      {
        projectId: project._id,
        title: 'Kitchen switchboard grounding issue',
        description: 'Floating ground reading on circuit B3.',
        location: 'Kitchen',
        status: 'In Progress',
        priority: 'High',
        assigneeId: userMap['BrightSpark Electricals'] || users[0]._id,
      },
      {
        projectId: project._id,
        title: 'Guest bathroom pipe misalignment',
        description: 'Trap fitting adjusted and sealed.',
        location: 'Guest Bathroom',
        status: 'Resolved',
        priority: 'Medium',
        assigneeId: userMap['FluidFlow Plumbing'] || users[0]._id,
      },
    ]);

    await Task.insertMany([
      {
        projectId: project._id,
        title: 'Inspect plumbing pressure test',
        description: 'Verify 5-bar hydrostatic pressure holding for 4 hours.',
        dueDate: tomorrow,
        status: 'Pending',
        assigneeId: userMap['Rahul Sharma'] || users[0]._id,
      },
      {
        projectId: project._id,
        title: 'Review structural beam casting',
        description: 'Cube test results received and approved.',
        dueDate: inFiveDays,
        status: 'Completed',
        assigneeId: userMap['Priya Mehta'] || users[0]._id,
      },
      {
        projectId: project._id,
        title: 'Finalize electrical conduit layout',
        description: 'Check slab conduits prior to second pour.',
        dueDate: inThreeDays,
        status: 'Pending',
        assigneeId: userMap['BrightSpark Electricals'] || users[0]._id,
      },
      {
        projectId: project._id,
        title: 'Check false ceiling framing level',
        description: 'Laser level check on perimeter channels.',
        dueDate: inThreeDays,
        status: 'Pending',
        assigneeId: userMap['Rahul Sharma'] || users[0]._id,
      },
    ]);

    console.log(`[Seed] Seeded initial demo snags (4) and tasks (4) for ${project.name}.`);
  }

  return project;
}

/**
 * Resolves an active project:
 * - If an explicit project ID, code, or name is provided, attempts to find that project.
 * - Otherwise (or if not found), reliably resolves and returns the demo project (Skyline Residence / SKY-204).
 *
 * @param {string} [explicitProjectRef] - Optional project ID, code, or name
 * @returns {Promise<Document>} The resolved Project document
 */
async function getActiveProject(explicitProjectRef) {
  if (explicitProjectRef && typeof explicitProjectRef === 'string' && explicitProjectRef.trim()) {
    const trimmed = explicitProjectRef.trim();

    // 1. Try finding by MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const foundById = await Project.findById(trimmed);
      if (foundById) {
        console.log(`[Project] Resolved explicit project by ID: "${foundById.name}" [ID: ${foundById._id}]`);
        return foundById;
      }
    }

    // 2. Try finding by code, name, or fullName
    const norm = normalize(trimmed);
    const candidate = await Project.findOne({
      $or: [
        { code: trimmed },
        { name: trimmed },
        { fullName: trimmed },
        { code: new RegExp(`^${norm}$`, 'i') },
        { name: new RegExp(`^${norm}$`, 'i') },
      ],
    });

    if (candidate) {
      console.log(`[Project] Resolved explicit project by name/code: "${candidate.name}" [ID: ${candidate._id}]`);
      return candidate;
    }

    console.warn(`[Project] Could not find explicit project matching "${explicitProjectRef}". Falling back to demo project.`);
  }

  // Fallback / default: resolve demo project (Skyline Residence / SKY-204)
  const demoProject = await getOrEnsureDemoProject();
  console.log(
    `[Project] Resolved active demo project: "${demoProject.name}" (${demoProject.code || 'SKY-204'}) [ID: ${demoProject._id}]`
  );
  return demoProject;
}

module.exports = {
  DEMO_PROJECT_CONFIG,
  getOrEnsureDemoProject,
  ensureDemoUsers,
  ensureDemoData,
  getActiveProject,
};
