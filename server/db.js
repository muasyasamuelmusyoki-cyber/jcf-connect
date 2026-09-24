const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'jcf.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function defaultData() {
  return {
    users: [],
    members: [],
    visitors: [],
    attendance: [],
    finance: [],
    events: [],
    assets: [],
    departments: [],
    dept_members: [],
    growth_groups: [],
    group_members: [],
    leaders: [],
    champs_classes: [],
    champs_students: [],
    settings: {},
    logs: []
  };
}

function load() {
  if (!fs.existsSync(DB_FILE)) {
    const data = defaultData();
    save(data);
    return data;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // Ensure new collections exist on old files
    const defaults = defaultData();
    Object.keys(defaults).forEach((key) => {
      if (data[key] === undefined) data[key] = defaults[key];
    });
    return data;
  } catch (e) {
    const data = defaultData();
    save(data);
    return data;
  }
}

function save(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let store = load();

function seedUsers() {
  store = load();

  // Never create default accounts with passwords hard-coded in source code.
  // Existing databases with users are left untouched.
  if (store.users && store.users.length > 0) return;

  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const name = (process.env.BOOTSTRAP_ADMIN_NAME || 'System Admin').trim();

  if (!email || !password) {
    console.log('No bootstrap admin configured. No default users were created.');
    return;
  }

  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters.');
  }

  store.users = [
    {
      id: 1,
      email,
      password: bcrypt.hashSync(password, 10),
      name,
      role: 'Super Admin',
      status: 'Active',
      access: ['*']
    }
  ];

  save(store);
  console.log('Bootstrap administrator created.');
}
seedUsers();

const db = {
  getStore() {
    store = load();
    return store;
  },
  saveStore() {
    save(store);
  },

  findUserByEmail(email) {
    store = load();
    const e = (email || '').toLowerCase();
    return (
      store.users.find(
        (u) => (u.email || '').toLowerCase() === e && u.status === 'Active'
      ) || null
    );
  },

  findUserById(id) {
    store = load();
    return store.users.find((u) => String(u.id) === String(id)) || null;
  },

  getMembers() {
    store = load();
    return store.members.slice().reverse();
  },

  getMember(id) {
    store = load();
    return store.members.find((m) => m.id === id) || null;
  },

  addMember(member) {
    store = load();
    store.members.push(member);
    save(store);
    return member;
  },

  updateMember(id, data) {
    store = load();
    const i = store.members.findIndex((m) => m.id === id);
    if (i === -1) return null;
    store.members[i] = { ...store.members[i], ...data, id };
    save(store);
    return store.members[i];
  },

  deleteMember(id) {
    store = load();
    const before = store.members.length;
    store.members = store.members.filter((m) => m.id !== id);
    save(store);
    return before !== store.members.length;
  }
};

module.exports = db;
