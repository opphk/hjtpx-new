const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'hjtpx';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

const MIGRATIONS_TABLE = 'migrations';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

/**
 * Calculate checksum of a file for integrity verification
 */
function calculateChecksum(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(fileContent).digest('hex');
}

/**
 * Parse migration file name to extract version and name
 */
function parseMigrationFileName(fileName) {
  const match = fileName.match(/^(\d+)_([^.]+)\.(up|down)\.sql$/);
  if (!match) return null;
  return {
    version: parseInt(match[1], 10),
    name: match[2],
    type: match[3]
  };
}

/**
 * Get all migration files sorted by version
 */
function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .map(f => ({
      fileName: f,
      parsed: parseMigrationFileName(f)
    }))
    .filter(f => f.parsed !== null)
    .sort((a, b) => a.parsed.version - b.parsed.version);
  
  return files;
}

/**
 * Group migration files by version
 */
function groupMigrationsByVersion(files) {
  const grouped = new Map();
  files.forEach(({ fileName, parsed }) => {
    if (!grouped.has(parsed.version)) {
      grouped.set(parsed.version, {
        version: parsed.version,
        name: parsed.name,
        up: null,
        down: null
      });
    }
    const migration = grouped.get(parsed.version);
    if (parsed.type === 'up') {
      migration.up = fileName;
    } else {
      migration.down = fileName;
    }
  });
  return Array.from(grouped.values()).sort((a, b) => a.version - b.version);
}

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      version INTEGER NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'up',
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      execution_time_ms INTEGER,
      status VARCHAR(20) DEFAULT 'success',
      checksum VARCHAR(64),
      error_message TEXT
    )
  `);
}

/**
 * Get all applied migrations from the database
 */
async function getAppliedMigrations(pool) {
  const result = await pool.query(
    `SELECT version, name, type, applied_at, status, checksum FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`
  );
  return result.rows;
}

/**
 * Get current database version
 */
async function getCurrentVersion(pool) {
  const result = await pool.query(
    `SELECT version FROM ${MIGRATIONS_TABLE} WHERE type = 'up' AND status = 'success' ORDER BY version DESC LIMIT 1`
  );
  return result.rows.length > 0 ? result.rows[0].version : 0;
}

/**
 * Record a migration in the database
 */
async function recordMigration(pool, { version, name, type, executionTime, status, checksum, errorMessage }) {
  await pool.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (version, name, type, execution_time_ms, status, checksum, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (version) DO UPDATE SET
       type = EXCLUDED.type,
       applied_at = CURRENT_TIMESTAMP,
       execution_time_ms = EXCLUDED.execution_time_ms,
       status = EXCLUDED.status,
       checksum = EXCLUDED.checksum,
       error_message = EXCLUDED.error_message`,
    [version, name, type, executionTime, status, checksum, errorMessage]
  );
}

/**
 * Execute a SQL file
 */
async function executeSqlFile(pool, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const startTime = Date.now();
    await client.query(sql);
    const executionTime = Date.now() - startTime;
    await client.query('COMMIT');
    return { success: true, executionTime };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Apply pending migrations
 */
async function migrateUp(pool, targetVersion = null) {
  const migrations = groupMigrationsByVersion(getMigrationFiles());
  const appliedMigrations = await getAppliedMigrations(pool);
  const currentVersion = await getCurrentVersion(pool);
  
  const appliedVersions = new Set(appliedMigrations.filter(m => m.type === 'up' && m.status === 'success').map(m => m.version));
  
  const pendingMigrations = migrations.filter(m => 
    !appliedVersions.has(m.version) && 
    (targetVersion === null || m.version <= targetVersion) &&
    m.version > currentVersion
  );
  
  if (pendingMigrations.length === 0) {
    console.log('No pending migrations');
    return;
  }
  
  console.log(`Found ${pendingMigrations.length} pending migration(s)`);
  
  for (const migration of pendingMigrations) {
    if (!migration.up) {
      console.warn(`Skipping migration ${migration.version} - no up script found`);
      continue;
    }
    
    console.log(`Applying migration ${migration.version}: ${migration.name}`);
    const filePath = path.join(MIGRATIONS_DIR, migration.up);
    const checksum = calculateChecksum(filePath);
    
    try {
      const result = await executeSqlFile(pool, filePath);
      await recordMigration(pool, {
        version: migration.version,
        name: migration.name,
        type: 'up',
        executionTime: result.executionTime,
        status: 'success',
        checksum,
        errorMessage: null
      });
      console.log(`✓ Migration ${migration.version} applied successfully (${result.executionTime}ms)`);
    } catch (error) {
      await recordMigration(pool, {
        version: migration.version,
        name: migration.name,
        type: 'up',
        executionTime: 0,
        status: 'failed',
        checksum,
        errorMessage: error.message
      });
      console.error(`✗ Migration ${migration.version} failed:`, error.message);
      throw error;
    }
  }
}

/**
 * Rollback migrations
 */
async function migrateDown(pool, targetVersion = null, steps = 1) {
  const appliedMigrations = await getAppliedMigrations(pool);
  const successfulUpMigrations = appliedMigrations
    .filter(m => m.type === 'up' && m.status === 'success')
    .sort((a, b) => b.version - a.version);
  
  if (successfulUpMigrations.length === 0) {
    console.log('No migrations to rollback');
    return;
  }
  
  const migrations = groupMigrationsByVersion(getMigrationFiles());
  const migrationsMap = new Map(migrations.map(m => [m.version, m]));
  
  let migrationsToRollback;
  if (targetVersion !== null) {
    migrationsToRollback = successfulUpMigrations.filter(m => m.version > targetVersion);
  } else {
    migrationsToRollback = successfulUpMigrations.slice(0, steps);
  }
  
  if (migrationsToRollback.length === 0) {
    console.log('No migrations to rollback');
    return;
  }
  
  console.log(`Rolling back ${migrationsToRollback.length} migration(s)`);
  
  for (const appliedMigration of migrationsToRollback) {
    const migration = migrationsMap.get(appliedMigration.version);
    if (!migration || !migration.down) {
      console.warn(`Skipping rollback of ${appliedMigration.version} - no down script found`);
      continue;
    }
    
    console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
    const filePath = path.join(MIGRATIONS_DIR, migration.down);
    const checksum = calculateChecksum(filePath);
    
    try {
      const result = await executeSqlFile(pool, filePath);
      await recordMigration(pool, {
        version: migration.version,
        name: migration.name,
        type: 'down',
        executionTime: result.executionTime,
        status: 'success',
        checksum,
        errorMessage: null
      });
      console.log(`✓ Rollback of ${migration.version} completed (${result.executionTime}ms)`);
    } catch (error) {
      await recordMigration(pool, {
        version: migration.version,
        name: migration.name,
        type: 'down',
        executionTime: 0,
        status: 'failed',
        checksum,
        errorMessage: error.message
      });
      console.error(`✗ Rollback of ${migration.version} failed:`, error.message);
      throw error;
    }
  }
}

/**
 * Show migration status
 */
async function showStatus(pool) {
  const migrations = groupMigrationsByVersion(getMigrationFiles());
  const appliedMigrations = await getAppliedMigrations(pool);
  const appliedMap = new Map(appliedMigrations.map(m => [m.version, m]));
  const currentVersion = await getCurrentVersion(pool);
  
  console.log('\n=== Migration Status ===');
  console.log(`Current version: ${currentVersion}`);
  console.log(`Total migrations: ${migrations.length}`);
  console.log('\nMigration history:');
  
  migrations.forEach(migration => {
    const applied = appliedMap.get(migration.version);
    let status = 'pending';
    let appliedAt = '';
    
    if (applied) {
      if (applied.type === 'up' && applied.status === 'success') {
        status = 'applied';
        appliedAt = applied.applied_at;
      } else if (applied.type === 'down' && applied.status === 'success') {
        status = 'rolled back';
      } else if (applied.status === 'failed') {
        status = `failed: ${applied.error_message}`;
      }
    }
    
    const statusIcon = status === 'applied' ? '✓' : status === 'pending' ? '○' : '✗';
    console.log(`  ${statusIcon} ${migration.version.toString().padStart(3)}: ${migration.name.padEnd(25)} ${status}${appliedAt ? ` (${appliedAt})` : ''}`);
  });
  
  console.log('========================\n');
}

/**
 * Create a new migration
 */
async function createMigration(name) {
  const migrations = groupMigrationsByVersion(getMigrationFiles());
  const nextVersion = migrations.length > 0 ? migrations[migrations.length - 1].version + 1 : 1;
  const timestamp = new Date().toISOString().split('T')[0];
  
  const upFileName = `${nextVersion.toString().padStart(3, '0')}_${name}.up.sql`;
  const downFileName = `${nextVersion.toString().padStart(3, '0')}_${name}.down.sql`;
  
  const upContent = `-- Migration: ${name}
-- Created: ${timestamp}
-- Description: [Add description here]

-- Write your migration SQL here

`;
  
  const downContent = `-- Rollback: ${name}
-- Description: [Add rollback description here]

-- Write your rollback SQL here

`;
  
  fs.writeFileSync(path.join(MIGRATIONS_DIR, upFileName), upContent);
  fs.writeFileSync(path.join(MIGRATIONS_DIR, downFileName), downContent);
  
  console.log(`Created migration ${nextVersion}: ${name}`);
  console.log(`  Up: ${upFileName}`);
  console.log(`  Down: ${downFileName}`);
}

/**
 * Main function
 */
async function main() {
  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });
  
  try {
    await createMigrationsTable(pool);
    
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'up':
        const targetVersionUp = args[1] ? parseInt(args[1], 10) : null;
        await migrateUp(pool, targetVersionUp);
        break;
        
      case 'down':
        if (args[1] === '--to' && args[2]) {
          await migrateDown(pool, parseInt(args[2], 10));
        } else if (args[1]) {
          await migrateDown(pool, null, parseInt(args[1], 10));
        } else {
          await migrateDown(pool);
        }
        break;
        
      case 'status':
        await showStatus(pool);
        break;
        
      case 'create':
        if (args[1]) {
          await createMigration(args[1]);
        } else {
          console.error('Please provide a migration name');
          process.exit(1);
        }
        break;
        
      default:
        console.log(`
Usage: node migrate.js <command> [options]

Commands:
  up [version]          Apply pending migrations (optionally up to a specific version)
  down [steps]          Rollback last [steps] migrations (default: 1)
  down --to <version>   Rollback down to a specific version
  status                Show migration status
  create <name>         Create a new migration

Examples:
  node migrate.js up
  node migrate.js up 5
  node migrate.js down
  node migrate.js down 3
  node migrate.js down --to 2
  node migrate.js status
  node migrate.js create add_users_table
`);
        process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });
}

module.exports = {
  migrateUp,
  migrateDown,
  showStatus,
  createMigration,
  getMigrationFiles,
  getCurrentVersion
};
