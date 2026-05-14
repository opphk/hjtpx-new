#!/usr/bin/env node
require('dotenv').config();
const { migrate, status } = require('./migrate');

async function runMigrations() {
  try {
    console.log('=== Running Database Migrations ===\n');

    console.log('Checking migration status...');
    await status();

    console.log('Applying migrations...');
    await migrate({ rollback: false });

    console.log('\n=== Migration Complete ===');
    console.log('Checking final status...');
    await status();

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
