const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'hjtpx';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

const MIGRATIONS_TABLE = 'migrations';
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLogLevel = process.env.MIGRATION_LOG_LEVEL
  ? LOG_LEVELS[process.env.MIGRATION_LOG_LEVEL.toUpperCase()] || LOG_LEVELS.INFO
  : LOG_LEVELS.INFO;

function log(level, message, data = null) {
  if (level >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level) || 'INFO';
    const logMessage = `[${timestamp}] [${levelName}] ${message}`;
    console.log(logMessage);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

function getMachineInfo() {
  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    pid: process.pid
  };
}

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
 * Check database health
 */
async function checkDatabaseHealth(pool) {
  try {
    const result = await pool.query(`
      SELECT
        current_setting('server_version_num') as version_num,
        current_setting('server_version') as version,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
        (SELECT sum(xact_commit) FROM pg_stat_database WHERE datname = current_database()) as total_commits,
        (SELECT sum(xact_rollback) FROM pg_stat_database WHERE datname = current_database()) as total_rollbacks
    `);

    const stats = result.rows[0];
    log(LOG_LEVELS.DEBUG, 'Database health check passed', stats);

    return {
      healthy: true,
      version: stats.version,
      activeConnections: parseInt(stats.active_connections),
      totalCommits: parseInt(stats.total_commits),
      totalRollbacks: parseInt(stats.total_rollbacks)
    };
  } catch (error) {
    log(LOG_LEVELS.ERROR, 'Database health check failed', { error: error.message });
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Get migration statistics
 */
async function getMigrationStats(pool) {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE type = 'up') as total_migrations,
      COUNT(*) FILTER (WHERE type = 'up' AND status = 'success') as successful_migrations,
      COUNT(*) FILTER (WHERE type = 'up' AND status = 'failed') as failed_migrations,
      COUNT(*) FILTER (WHERE type = 'down') as rollbacks,
      MAX(applied_at) FILTER (WHERE status = 'success') as last_successful_migration,
      MIN(applied_at) FILTER (WHERE status = 'success') as first_migration,
      AVG(execution_time_ms) FILTER (WHERE status = 'success') as avg_execution_time
    FROM ${MIGRATIONS_TABLE}
  `);

  return result.rows[0];
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
 * Show migration status with enhanced reporting
 */
async function showStatus(pool) {
  const migrations = groupMigrationsByVersion(getMigrationFiles());
  const appliedMigrations = await getAppliedMigrations(pool);
  const appliedMap = new Map(appliedMigrations.map(m => [m.version, m]));
  const currentVersion = await getCurrentVersion(pool);
  const health = await checkDatabaseHealth(pool);
  const stats = await getMigrationStats(pool);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              Database Migration Status Report                  ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ Database Information                                            │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ Host: ${DB_HOST}:${DB_PORT}`.padEnd(64) + '│');
  console.log(`│ Database: ${DB_NAME}`.padEnd(64) + '│');
  console.log(`│ Version: ${health.healthy ? health.version : 'N/A'}`.padEnd(64) + '│');
  console.log(`│ Active Connections: ${health.healthy ? health.activeConnections : 'N/A'}`.padEnd(64) + '│');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ Migration Statistics                                            │');
  console.log('├─────────────────────────────────────────────────────────────────┤');
  console.log(`│ Total Migrations: ${stats.total_migrations || 0}`.padEnd(64) + '│');
  console.log(`│ Successful: ${stats.successful_migrations || 0}`.padEnd(64) + '│');
  console.log(`│ Failed: ${stats.failed_migrations || 0}`.padEnd(64) + '│');
  console.log(`│ Rollbacks: ${stats.rollbacks || 0}`.padEnd(64) + '│');
  console.log(`│ Avg Execution Time: ${stats.avg_execution_time ? Math.round(stats.avg_execution_time) + 'ms' : 'N/A'}`.padEnd(64) + '│');
  console.log(`│ Current Version: ${currentVersion}`.padEnd(64) + '│');
  console.log('└─────────────────────────────────────────────────────────────────┘\n');

  console.log('┌─────────────────────────────────────────────────────────────────┐');
  console.log('│ Migration History                                               │');
  console.log('├─────┬────────────────────────────────────────┬────────┬──────────┤');
  console.log('│ Ver │ Name                                   │ Status │ Time     │');
  console.log('├─────┼────────────────────────────────────────┼────────┼──────────┤');

  migrations.forEach(migration => {
    const applied = appliedMap.get(migration.version);
    let status = 'pending';
    let time = '';
    let statusSymbol = '○';

    if (applied) {
      if (applied.type === 'up' && applied.status === 'success') {
        status = 'applied';
        time = applied.execution_time_ms ? `${applied.execution_time_ms}ms` : '';
        statusSymbol = '✓';
      } else if (applied.type === 'down' && applied.status === 'success') {
        status = 'rolled back';
        statusSymbol = '↺';
      } else if (applied.status === 'failed') {
        status = 'failed';
        statusSymbol = '✗';
      }
    }

    const version = migration.version.toString().padStart(3);
    const name = migration.name.substring(0, 40).padEnd(40);
    const statusDisplay = status.substring(0, 8).padEnd(8);
    const timeDisplay = time.substring(0, 10).padEnd(10);

    console.log(`│ ${version} │ ${name} │ ${statusDisplay} │ ${timeDisplay} │`);
  });

  console.log('└─────┴────────────────────────────────────────┴────────┴──────────┘\n');

  console.log('Legend: ○ = Pending | ✓ = Applied | ↺ = Rolled Back | ✗ = Failed\n');

  log(LOG_LEVELS.DEBUG, 'Status report generated', {
    currentVersion,
    totalMigrations: migrations.length,
    stats
  });
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
 * Main function with enhanced error handling and logging
 */
async function main() {
  const startTime = Date.now();
  const machineInfo = getMachineInfo();

  log(LOG_LEVELS.INFO, 'Migration process starting', {
    machine: machineInfo,
    arguments: process.argv.slice(2),
    nodeVersion: process.version,
    cwd: process.cwd()
  });

  const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  try {
    log(LOG_LEVELS.INFO, 'Connecting to database', {
      host: DB_HOST,
      port: DB_PORT,
      database: DB_NAME
    });

    await createMigrationsTable(pool);
    log(LOG_LEVELS.DEBUG, 'Migrations table initialized');

    const dbHealth = await checkDatabaseHealth(pool);
    if (!dbHealth.healthy) {
      log(LOG_LEVELS.WARN, 'Database health check failed, proceeding anyway', {
        error: dbHealth.error
      });
    } else {
      log(LOG_LEVELS.DEBUG, 'Database health check passed', dbHealth);
    }

    const args = process.argv.slice(2);
    const command = args[0] || 'status';

    log(LOG_LEVELS.INFO, `Executing command: ${command}`, { args });

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

      case 'health':
        const health = await checkDatabaseHealth(pool);
        console.log('\n=== Database Health Check ===');
        console.log(JSON.stringify(health, null, 2));
        break;

      case 'stats':
        const stats = await getMigrationStats(pool);
        console.log('\n=== Migration Statistics ===');
        console.log(JSON.stringify(stats, null, 2));
        break;

      default:
        console.log(`
Usage: node migrate.js <command> [options]

Commands:
  up [version]          Apply pending migrations (optionally up to a specific version)
  down [steps]          Rollback last [steps] migrations (default: 1)
  down --to <version>   Rollback down to a specific version
  status                Show migration status (default)
  create <name>         Create a new migration
  health                Check database health
  stats                 Show migration statistics

Environment Variables:
  DB_HOST               Database host (default: localhost)
  DB_PORT               Database port (default: 5432)
  DB_NAME               Database name (default: hjtpx)
  DB_USER               Database user (default: postgres)
  DB_PASSWORD           Database password (default: postgres)
  MIGRATION_LOG_LEVEL   Log level: DEBUG, INFO, WARN, ERROR (default: INFO)

Examples:
  node migrate.js up
  node migrate.js up 5
  node migrate.js down
  node migrate.js down 3
  node migrate.js down --to 2
  node migrate.js status
  node migrate.js create add_users_table
  node migrate.js health
  node migrate.js stats
  MIGRATION_LOG_LEVEL=DEBUG node migrate.js status
`);
        process.exit(1);
    }

    const executionTime = Date.now() - startTime;
    log(LOG_LEVELS.INFO, 'Migration process completed', {
      command,
      executionTimeMs: executionTime,
      success: true
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    log(LOG_LEVELS.ERROR, 'Migration process failed', {
      command: process.argv.slice(2),
      executionTimeMs: executionTime,
      error: error.message,
      stack: error.stack
    });

    console.error('\n❌ Migration failed:', error.message);
    if (process.env.MIGRATION_LOG_LEVEL === 'DEBUG') {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
    log(LOG_LEVELS.DEBUG, 'Database connection closed');
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
  getCurrentVersion,
  checkDatabaseHealth,
  getMigrationStats,
  LOG_LEVELS
};
