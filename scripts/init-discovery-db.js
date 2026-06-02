// scripts/init-discovery-db.js
const { getDb } = require('../lib/db');
getDb();
console.log('Discovery tables created successfully');
process.exit();