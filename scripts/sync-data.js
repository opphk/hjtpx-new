#!/usr/bin/env node

require('dotenv').config();

const { syncService } = require('../src/backend/services/search');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const args = process.argv.slice(2);
const command = args[0] || 'sync';

async function main() {
  try {
    logger.info('Initializing sync service...');
    await syncService.initialize();

    switch (command) {
      case 'sync':
        await runSync();
        break;
      case 'sync-all':
        await runFullSync();
        break;
      case 'sync-users':
        await runUsersSync();
        break;
      case 'sync-content':
        await runContentSync();
        break;
      case 'sync-logs':
        await runLogsSync();
        break;
      case 'sync-notifications':
        await runNotificationsSync();
        break;
      case 'status':
        await showStatus();
        break;
      case 'start':
        await startIncrementalSync();
        break;
      case 'stop':
        await stopIncrementalSync();
        break;
      case 'help':
        showHelp();
        break;
      default:
        logger.error(`Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }

    await syncService.cleanup();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

async function runSync() {
  const fullSync = args.includes('--full');
  const index = args.find(arg => arg.startsWith('--index='))?.split('=')[1];

  logger.info('Running sync...', { fullSync, index });

  if (index) {
    switch (index) {
      case 'users':
        const usersResult = await syncService.syncUsers({ fullSync });
        logger.info('Users sync completed', usersResult);
        break;
      case 'content':
        const contentResult = await syncService.syncContent({ fullSync });
        logger.info('Content sync completed', contentResult);
        break;
      case 'logs':
        const logsResult = await syncService.syncLogs({ fullSync });
        logger.info('Logs sync completed', logsResult);
        break;
      case 'notifications':
        const notificationsResult = await syncService.syncNotifications({ fullSync });
        logger.info('Notifications sync completed', notificationsResult);
        break;
      default:
        logger.error(`Unknown index: ${index}`);
    }
  } else {
    const result = await syncService.syncAll({ fullSync });
    logger.info('Full sync completed', result);
  }
}

async function runFullSync() {
  logger.info('Running full sync...');
  const result = await syncService.syncAll({ fullSync: true });
  logger.info('Full sync completed', result);
}

async function runUsersSync() {
  logger.info('Syncing users...');
  const result = await syncService.syncUsers({ fullSync: args.includes('--full') });
  logger.info('Users sync completed', result);
}

async function runContentSync() {
  logger.info('Syncing content...');
  const contentType = args.find(arg => arg.startsWith('--type='))?.split('=')[1];
  const result = await syncService.syncContent({ fullSync: args.includes('--full'), contentType });
  logger.info('Content sync completed', result);
}

async function runLogsSync() {
  logger.info('Syncing logs...');
  const logType = args.find(arg => arg.startsWith('--type='))?.split('=')[1];
  const result = await syncService.syncLogs({ fullSync: args.includes('--full'), logType });
  logger.info('Logs sync completed', result);
}

async function runNotificationsSync() {
  logger.info('Syncing notifications...');
  const result = await syncService.syncNotifications({ fullSync: args.includes('--full') });
  logger.info('Notifications sync completed', result);
}

async function showStatus() {
  logger.info('Getting sync status...');
  const status = await syncService.getSyncStatus();
  console.log('\n=== Sync Status ===');
  console.log(`Running: ${status.running}`);
  console.log('\nIndices:');
  for (const [index, info] of Object.entries(status.indices)) {
    console.log(`  ${index}:`);
    console.log(`    Last Sync: ${info.lastSync || 'Never'}`);
    console.log(`    Next Sync: ${info.nextSync || 'Not scheduled'}`);
  }
}

async function startIncrementalSync() {
  logger.info('Starting incremental sync service...');
  
  const indices = args.find(arg => arg.startsWith('--indices='))
    ?.split('=')[1]
    ?.split(',') || ['users', 'content', 'logs', 'notifications'];

  await syncService.startIncrementalSync(indices);
  
  logger.info(`Incremental sync started for: ${indices.join(', ')}`);
  logger.info('Press Ctrl+C to stop...');

  process.on('SIGINT', async () => {
    logger.info('\nStopping incremental sync...');
    await syncService.cleanup();
    process.exit(0);
  });
}

async function stopIncrementalSync() {
  logger.info('Stopping incremental sync service...');
  syncService.stopIncrementalSync();
  await syncService.cleanup();
  logger.info('Incremental sync stopped');
}

function showHelp() {
  console.log(`
Elasticsearch Sync Script

Usage: node sync-data.js [command] [options]

Commands:
  sync              Run sync for all indices (incremental by default)
  sync-all          Run full sync for all indices
  sync-users        Sync users index
  sync-content      Sync content index
  sync-logs         Sync logs index
  sync-notifications Sync notifications index
  status            Show sync status
  start             Start incremental sync service
  stop              Stop incremental sync service
  help              Show this help message

Options:
  --full            Run full sync instead of incremental
  --index=<name>    Sync specific index (users, content, logs, notifications)
  --type=<type>     Filter by type (for content and logs)
  --indices=<list>  Comma-separated list of indices to sync (for start command)

Examples:
  node scripts/sync-data.js sync
  node scripts/sync-data.js sync --full
  node scripts/sync-data.js sync --index=users
  node scripts/sync-data.js sync-all
  node scripts/sync-data.js start --indices=users,content
  node scripts/sync-data.js status
  `);
}

main();
