const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Snag = require('../models/Snag');
const Task = require('../models/Task');

const DEMO_PROJECTS = [
  {
    name: 'Skyline Residence',
    code: 'SKY-204',
    fullName: 'Skyline Luxury Residence, Phase 2',
    location: 'Sector 150, Expressway, Noida',
    description: 'High-end residential tower development consisting of 24 floors and premium clubhouse amenities.',
    status: 'Active',
    budget: '₹42.5 Cr',
  },
  {
    name: 'Green Valley Apartments',
    code: 'GVA-101',
    fullName: 'Green Valley Eco-Living Towers',
    location: 'Sector 62, Golf Course Ext, Gurgaon',
    description: 'Multi-tower residential condominium complex focusing on sustainable water recycling and solar integration.',
    status: 'Active',
    budget: '₹68.0 Cr',
  },
  {
    name: 'Commercial Office Building',
    code: 'COB-502',
    fullName: 'Infinity Tech Park, Tower C',
    location: 'Whitefield Tech Corridor, Bengaluru',
    description: 'Grade-A commercial workspace featuring smart HVAC, dual power backup, and modern facade cladding.',
    status: 'Active',
    budget: '₹115.0 Cr',
  },
];

const DEMO_USERS = [
  {
    name: 'Aditya Singhania',
    email: 'admin@sitevoice.com',
    password: 'admin123',
    role: 'Admin',
    company: 'SiteVoice Infrastructure',
    phone: '+91 98100 12345',
  },
  {
    name: 'Priya Mehta',
    email: 'priya@sitevoice.com',
    password: 'pm123',
    role: 'Project Manager',
    company: 'Skyline Project Delivery',
    phone: '+91 98110 23456',
  },
  {
    name: 'Vikram Malhotra',
    email: 'vikram@sitevoice.com',
    password: 'pm123',
    role: 'Project Manager',
    company: 'Apex Project Management',
    phone: '+91 98120 34567',
  },
  {
    name: 'Rahul Sharma',
    email: 'rahul@sitevoice.com',
    password: 'engineer123',
    role: 'Site Engineer',
    company: 'SiteVoice Field Engineering',
    phone: '+91 98130 45678',
  },
  {
    name: 'BrightSpark Electricals',
    email: 'brightspark@sitevoice.com',
    password: 'contractor123',
    role: 'Electrical Contractor',
    company: 'BrightSpark MEP Solutions',
    phone: '+91 98140 56789',
  },
  {
    name: 'Apex Ceilings',
    email: 'apex@sitevoice.com',
    password: 'contractor123',
    role: 'False-Ceiling Contractor',
    company: 'Apex Interior Finishes',
    phone: '+91 98150 67890',
  },
  {
    name: 'FluidFlow Plumbing',
    email: 'fluidflow@sitevoice.com',
    password: 'contractor123',
    role: 'Plumbing Contractor',
    company: 'FluidFlow Sanitary Services',
    phone: '+91 98160 78901',
  },
  {
    name: 'BuildCraft Civil',
    email: 'buildcraft@sitevoice.com',
    password: 'contractor123',
    role: 'Civil Contractor',
    company: 'BuildCraft Structural Engineering',
    phone: '+91 98170 89012',
  },
];

function normalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Ensures demo projects exist and returns all active projects.
 */
async function ensureDemoProjects() {
  const existingProjects = await Project.find({});
  const projectsByName = new Map();
  existingProjects.forEach((p) => projectsByName.set(p.name, p));

  const savedProjects = [];

  for (const demoP of DEMO_PROJECTS) {
    let p = projectsByName.get(demoP.name);
    if (!p) {
      p = await Project.create(demoP);
      console.log(`[Project] Created project: "${p.name}" (${p.code}) [ID: ${p._id}]`);
    } else {
      let modified = false;
      if (!p.code && demoP.code) { p.code = demoP.code; modified = true; }
      if (!p.description && demoP.description) { p.description = demoP.description; modified = true; }
      if (modified) await p.save();
    }
    savedProjects.push(p);
  }

  return savedProjects;
}

/**
 * Ensures demo users exist with valid email, password, and project assignments.
 */
async function ensureDemoUsers(projects) {
  const allProjects = projects && projects.length ? projects : await Project.find({});
  const skylineProj = allProjects.find((p) => p.name.includes('Skyline')) || allProjects[0];
  const greenValleyProj = allProjects.find((p) => p.name.includes('Green Valley')) || allProjects[1] || skylineProj;
  const commercialProj = allProjects.find((p) => p.name.includes('Commercial')) || allProjects[2] || skylineProj;

  const existingUsers = await User.find({});
  const userMap = new Map();
  existingUsers.forEach((u) => {
    userMap.set(u.email || u.name, u);
    userMap.set(u.name, u);
  });

  const savedUsers = [];

  for (const demoU of DEMO_USERS) {
    let u = userMap.get(demoU.email) || userMap.get(demoU.name);

    // Determine project assignments based on role
    let assignedProjects = [];
    if (demoU.role === 'Admin') {
      assignedProjects = allProjects.map((p) => p._id);
    } else if (demoU.email === 'priya@sitevoice.com') {
      assignedProjects = [skylineProj._id, greenValleyProj._id];
    } else if (demoU.email === 'vikram@sitevoice.com') {
      assignedProjects = [commercialProj._id];
    } else if (demoU.email === 'brightspark@sitevoice.com') {
      assignedProjects = [skylineProj._id, greenValleyProj._id];
    } else if (demoU.email === 'apex@sitevoice.com') {
      assignedProjects = [skylineProj._id, commercialProj._id];
    } else if (demoU.email === 'fluidflow@sitevoice.com') {
      assignedProjects = [skylineProj._id, greenValleyProj._id];
    } else if (demoU.email === 'buildcraft@sitevoice.com') {
      assignedProjects = [skylineProj._id, commercialProj._id];
    } else {
      assignedProjects = [skylineProj._id, greenValleyProj._id];
    }

    if (!u) {
      u = await User.create({
        ...demoU,
        assignedProjects,
      });
      console.log(`[Users] Created user: "${u.name}" (${u.role}) - ${u.email}`);
    } else {
      let modified = false;
      if (!u.email) { u.email = demoU.email; modified = true; }
      if (!u.password) { u.password = demoU.password; modified = true; }
      if (!u.company) { u.company = demoU.company; modified = true; }
      if (!u.phone) { u.phone = demoU.phone; modified = true; }
      if (!u.assignedProjects || u.assignedProjects.length === 0) {
        u.assignedProjects = assignedProjects;
        modified = true;
      }
      if (modified) await u.save();
    }
    savedUsers.push(u);
  }

  return savedUsers;
}

/**
 * Ensures demo data (projects, users, snags, tasks) across all projects.
 */
async function ensureDemoData() {
  const projects = await ensureDemoProjects();
  const users = await ensureDemoUsers(projects);

  const skyline = projects.find((p) => p.name.includes('Skyline')) || projects[0];
  const greenValley = projects.find((p) => p.name.includes('Green Valley')) || projects[1] || skyline;
  const commercial = projects.find((p) => p.name.includes('Commercial')) || projects[2] || skyline;

  const userByName = {};
  users.forEach((u) => {
    userByName[u.name] = u;
    userByName[u.role] = u;
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inThreeDays = new Date();
  inThreeDays.setDate(inThreeDays.getDate() + 3);
  const inFiveDays = new Date();
  inFiveDays.setDate(inFiveDays.getDate() + 5);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // 1. Check Skyline Data
  const skylineSnagCount = await Snag.countDocuments({ projectId: skyline._id });
  if (skylineSnagCount === 0) {
    await Snag.insertMany([
      {
        projectId: skyline._id,
        title: 'Master bathroom ceiling dampness',
        description: 'Minor moisture seepage detected near outer gypsum joint.',
        location: 'Master Bathroom, 4th Floor',
        status: 'Open',
        priority: 'High',
        assigneeId: userByName['Apex Ceilings']?._id || users[0]._id,
      },
      {
        projectId: skyline._id,
        title: 'Balcony railing paint chipping',
        description: 'Primer exposed on east railing baluster.',
        location: 'Balcony, Unit 402',
        status: 'Open',
        priority: 'Low',
        assigneeId: userByName['BuildCraft Civil']?._id || users[0]._id,
      },
      {
        projectId: skyline._id,
        title: 'Kitchen switchboard grounding issue',
        description: 'Floating ground reading on circuit B3.',
        location: 'Kitchen, Unit 301',
        status: 'In Progress',
        priority: 'High',
        assigneeId: userByName['BrightSpark Electricals']?._id || users[0]._id,
      },
      {
        projectId: skyline._id,
        title: 'Guest bathroom pipe misalignment',
        description: 'Trap fitting adjusted and sealed.',
        location: 'Guest Bathroom, Unit 204',
        status: 'Resolved',
        priority: 'Medium',
        assigneeId: userByName['FluidFlow Plumbing']?._id || users[0]._id,
      },
    ]);
  }

  const skylineTaskCount = await Task.countDocuments({ projectId: skyline._id });
  if (skylineTaskCount === 0) {
    await Task.insertMany([
      {
        projectId: skyline._id,
        title: 'Inspect plumbing pressure test',
        description: 'Verify 5-bar hydrostatic pressure holding for 4 hours on riser line 2.',
        instructions: 'Check pressure gauges at 10-minute intervals and note pressure drop if any.',
        dueDate: tomorrow,
        status: 'Pending',
        priority: 'High',
        assigneeId: userByName['Rahul Sharma']?._id || users[0]._id,
        updates: [],
      },
      {
        projectId: skyline._id,
        title: 'Finalize electrical conduit layout',
        description: 'Check slab conduits prior to second pour on Tower A level 6.',
        instructions: 'Ensure all ceiling drop junction boxes are tied securely to rebar.',
        dueDate: inThreeDays,
        status: 'In Progress',
        priority: 'High',
        assigneeId: userByName['BrightSpark Electricals']?._id || users[0]._id,
        updates: [
          {
            text: 'Conduits laid on bays 1 through 4. Awaiting rebar inspection.',
            authorName: 'BrightSpark Electricals',
            authorRole: 'Electrical Contractor',
          },
        ],
      },
      {
        projectId: skyline._id,
        title: 'Check false ceiling framing level',
        description: 'Laser level check on perimeter channels in living room.',
        instructions: 'Tolerance is maximum ±2mm across 3-meter span.',
        dueDate: inThreeDays,
        status: 'Pending',
        priority: 'Medium',
        assigneeId: userByName['Apex Ceilings']?._id || users[0]._id,
        updates: [],
      },
      {
        projectId: skyline._id,
        title: 'Review structural beam casting',
        description: 'Cube test results received and approved for 28-day curing.',
        instructions: 'Document compressive strength certificates in project folder.',
        dueDate: inFiveDays,
        status: 'Completed',
        priority: 'Critical',
        assigneeId: userByName['Priya Mehta']?._id || users[0]._id,
        updates: [
          {
            text: 'Cube compressive strength met 35 N/mm2 standard.',
            authorName: 'Priya Mehta',
            authorRole: 'Project Manager',
          },
        ],
      },
    ]);
  }

  // 2. Seed Green Valley Apartments if empty
  const gvTaskCount = await Task.countDocuments({ projectId: greenValley._id });
  if (gvTaskCount === 0) {
    await Task.insertMany([
      {
        projectId: greenValley._id,
        title: 'Pour foundation raft for Tower B',
        description: 'Coordinate ready-mix concrete batching for 450 cubic meters.',
        instructions: 'Deploy 2 concrete pump trucks with standby vibrating needles.',
        dueDate: tomorrow,
        status: 'In Progress',
        priority: 'Critical',
        assigneeId: userByName['BuildCraft Civil']?._id || users[0]._id,
        updates: [
          {
            text: 'First 200m3 poured. Slump test within 120mm tolerance.',
            authorName: 'BuildCraft Civil',
            authorRole: 'Civil Contractor',
          },
        ],
      },
      {
        projectId: greenValley._id,
        title: 'Install underground rainwater harvesting sump',
        description: 'Lay storm water inlet pipes with silt filtration chamber.',
        instructions: 'Test gradient flow with dye tracer before backfilling.',
        dueDate: inFiveDays,
        status: 'Pending',
        priority: 'High',
        assigneeId: userByName['FluidFlow Plumbing']?._id || users[0]._id,
        updates: [],
      },
      {
        projectId: greenValley._id,
        title: 'Substation transformer earthing grid',
        description: 'Drive copper earth electrodes and connect ring bus.',
        instructions: 'Megger earth resistance test target below 1.0 Ohm.',
        dueDate: yesterday,
        status: 'Pending',
        priority: 'Critical',
        assigneeId: userByName['BrightSpark Electricals']?._id || users[0]._id,
        updates: [],
      },
    ]);

    await Snag.insertMany([
      {
        projectId: greenValley._id,
        title: 'Basement retaining wall honeycombing',
        description: 'Concrete segregation spotted near grid line C-4.',
        location: 'Basement 1, North Wall',
        status: 'Open',
        priority: 'High',
        assigneeId: userByName['BuildCraft Civil']?._id || users[0]._id,
      },
      {
        projectId: greenValley._id,
        title: 'Drainage pipe sleeve missing at grade beam',
        description: 'Plumbing sleeve was omitted before concrete casting.',
        location: 'Tower B Podium',
        status: 'In Progress',
        priority: 'Medium',
        assigneeId: userByName['FluidFlow Plumbing']?._id || users[0]._id,
      },
    ]);
  }

  // 3. Seed Commercial Office Building if empty
  const comTaskCount = await Task.countDocuments({ projectId: commercial._id });
  if (comTaskCount === 0) {
    await Task.insertMany([
      {
        projectId: commercial._id,
        title: 'Glass curtain wall facade installation',
        description: 'Erect double-glazed thermal acoustic panels on floors 8 to 12.',
        instructions: 'Verify EPDM weather-seals and structural silicone adhesion.',
        dueDate: inFiveDays,
        status: 'In Progress',
        priority: 'High',
        assigneeId: userByName['BuildCraft Civil']?._id || users[0]._id,
        updates: [
          {
            text: 'Level 8 and 9 brackets fixed. Crane hoisted 34 glass panels.',
            authorName: 'BuildCraft Civil',
            authorRole: 'Civil Contractor',
          },
        ],
      },
      {
        projectId: commercial._id,
        title: 'Server room acoustic ceiling and baffle grid',
        description: 'Fit sound-dampening mineral fiber tiles and cable tray penetrations.',
        instructions: 'Seal all cable tray perimeters with intumescent firestop collars.',
        dueDate: tomorrow,
        status: 'Pending',
        priority: 'Medium',
        assigneeId: userByName['Apex Ceilings']?._id || users[0]._id,
        updates: [],
      },
    ]);

    await Snag.insertMany([
      {
        projectId: commercial._id,
        title: 'Fire sprinkler line clearance obstructed by cable tray',
        description: 'Main sprinkler branch pipe lacks required 150mm clearance from low-voltage tray.',
        location: 'Floor 7, East Corridor',
        status: 'Open',
        priority: 'Critical',
        assigneeId: userByName['Apex Ceilings']?._id || users[0]._id,
      },
    ]);
  }

  return skyline;
}

/**
 * Resolves active project by ID, name, code, or fallback to first project.
 */
async function getActiveProject(explicitProjectRef) {
  if (explicitProjectRef && typeof explicitProjectRef === 'string' && explicitProjectRef.trim()) {
    const trimmed = explicitProjectRef.trim();

    if (mongoose.Types.ObjectId.isValid(trimmed)) {
      const found = await Project.findById(trimmed);
      if (found) return found;
    }

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

    if (candidate) return candidate;
  }

  const allProjects = await Project.find({});
  if (allProjects.length > 0) {
    const skyline = allProjects.find((p) => p.name.includes('Skyline'));
    return skyline || allProjects[0];
  }

  return await ensureDemoData();
}

module.exports = {
  DEMO_PROJECTS,
  DEMO_USERS,
  ensureDemoProjects,
  ensureDemoUsers,
  ensureDemoData,
  getActiveProject,
};
