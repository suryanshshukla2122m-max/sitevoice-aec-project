require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Snag = require('../models/Snag');
const Task = require('../models/Task');

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Seed Error] MONGODB_URI environment variable is required to seed the database.');
    process.exit(1);
  }
  const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
  console.log(`[Seed] Connecting to MongoDB Atlas at ${maskedUri}...`);

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('[Seed] Connected successfully.');

  console.log('[Seed] Clearing existing collections...');
  await Promise.all([
    Project.deleteMany({}),
    User.deleteMany({}),
    Snag.deleteMany({}),
    Task.deleteMany({}),
  ]);

  console.log('[Seed] Creating primary project: Skyline Residence (SKY-204)...');
  const project = await Project.create({
    name: 'Skyline Residence',
    code: 'SKY-204',
    fullName: 'Skyline Luxury Residence, Phase 2',
    location: 'Sector 150, Expressway, Noida',
    status: 'Active',
  });

  console.log('[Seed] Creating team members and contractors...');
  const users = await User.insertMany([
    {
      name: 'Rahul Sharma',
      role: 'Site Engineer',
    },
    {
      name: 'Priya Mehta',
      role: 'Project Manager',
    },
    {
      name: 'Apex Ceilings',
      role: 'False-Ceiling Contractor',
    },
    {
      name: 'BrightSpark Electricals',
      role: 'Electrical Contractor',
    },
    {
      name: 'FluidFlow Plumbing',
      role: 'Plumbing Contractor',
    },
    {
      name: 'BuildCraft Civil',
      role: 'Civil Contractor',
    },
  ]);

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

  console.log('[Seed] Creating initial snags...');
  await Snag.insertMany([
    {
      projectId: project._id,
      title: 'Master bathroom ceiling dampness',
      description: 'Minor moisture seepage detected near outer gypsum joint.',
      location: 'Master Bathroom',
      status: 'Open',
      priority: 'High',
      assigneeId: userMap['Apex Ceilings'],
    },
    {
      projectId: project._id,
      title: 'Balcony railing paint chipping',
      description: 'Primer exposed on east railing baluster.',
      location: 'Balcony',
      status: 'Open',
      priority: 'Low',
      assigneeId: userMap['BuildCraft Civil'],
    },
    {
      projectId: project._id,
      title: 'Kitchen switchboard grounding issue',
      description: 'Floating ground reading on circuit B3.',
      location: 'Kitchen',
      status: 'In Progress',
      priority: 'High',
      assigneeId: userMap['BrightSpark Electricals'],
    },
    {
      projectId: project._id,
      title: 'Guest bathroom pipe misalignment',
      description: 'Trap fitting adjusted and sealed.',
      location: 'Guest Bathroom',
      status: 'Resolved',
      priority: 'Medium',
      assigneeId: userMap['FluidFlow Plumbing'],
    },
  ]);

  console.log('[Seed] Creating initial tasks...');
  await Task.insertMany([
    {
      projectId: project._id,
      title: 'Inspect plumbing pressure test',
      description: 'Verify 5-bar hydrostatic pressure holding for 4 hours.',
      dueDate: tomorrow,
      status: 'Pending',
      assigneeId: userMap['Rahul Sharma'],
    },
    {
      projectId: project._id,
      title: 'Review structural beam casting',
      description: 'Cube test results received and approved.',
      dueDate: inFiveDays,
      status: 'Completed',
      assigneeId: userMap['Priya Mehta'],
    },
    {
      projectId: project._id,
      title: 'Finalize electrical conduit layout',
      description: 'Check slab conduits prior to second pour.',
      dueDate: inThreeDays,
      status: 'Pending',
      assigneeId: userMap['BrightSpark Electricals'],
    },
    {
      projectId: project._id,
      title: 'Check false ceiling framing level',
      description: 'Laser level check on perimeter channels.',
      dueDate: inThreeDays,
      status: 'Pending',
      assigneeId: userMap['Rahul Sharma'],
    },
  ]);

  console.log('✅ [Seed] Database seeded successfully!');
  console.log(`   Project: "${project.name}" (ID: ${project._id})`);
  console.log(`   Users created: ${users.length}`);
  console.log('   Snags created: 4');
  console.log('   Tasks created: 4');

  await mongoose.disconnect();
  console.log('[Seed] Disconnected cleanly.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
