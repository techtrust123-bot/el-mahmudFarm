/**
 * Backup Service
 * Handles multi-tenant database backups and restores using MongoDB Database Tools.
 */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { MongoClient } = require('mongodb');
const { validateMongoUri, resolveMainDatabaseName, normalizeBackupOptions, formatBytes } = require('./backupHelpers');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const BACKUP_DIR = path.join(__dirname, '../../backups');
const DEFAULT_BACKUP_RETENTION_DAYS = 14;
const MINIMUM_BACKUPS_TO_KEEP = 5;
const FARM_DATABASE_PREFIX = 'farm_';
let activeBackupOperation = null;

/**
 * Ensure the backup storage directory exists.
 * @returns {Promise<string>} The backup directory path.
 */
async function ensureBackupDirectory() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  return BACKUP_DIR;
}

/**
 * Validate and normalize the configured MongoDB connection string.
 * @param {string} mongoUri - The raw MongoDB URI.
 * @returns {string} A validated MongoDB URI.
 * @throws {ApiError} When the URI is missing or invalid.
 */
/**
 * Execute a MongoDB Database Tools command with a promise-based API.
 * @param {string} command - The CLI command to run.
 * @param {string[]} args - The CLI arguments.
 * @param {object} options - Optional execution settings.
 * @returns {Promise<object>} The tool stdout and stderr output.
 * @throws {ApiError} When the tool is missing or the command fails.
 */
function runMongoTool(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, {
      cwd: BACKUP_DIR,
      maxBuffer: 1024 * 1024 * 20,
      timeout: options.timeout || 1800000,
      windowsHide: true
    }, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 'ENOENT') {
          reject(new ApiError(500, `${command} is not installed or is not available on PATH. Please install MongoDB Database Tools.`));
          return;
        }

        const details = stderr || stdout || error.message;
        reject(new ApiError(500, `${command} failed: ${details}`, { command, args }));
        return;
      }

      resolve({ stdout, stderr });
    });

    if (options.signal) {
      if (options.signal.aborted) {
        child.kill('SIGTERM');
      }

      options.signal.addEventListener('abort', () => child.kill('SIGTERM'), { once: true });
    }
  });
}

/**
 * Retrieve the MongoDB server version if available.
 * @param {string} mongoUri - The MongoDB URI.
 * @returns {Promise<string|null>} The server version or null.
 */
async function getMongoServerVersion(mongoUri) {
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const result = await client.db().admin().serverInfo();
    return result?.version || null;
  } catch (error) {
    logger.warn('Unable to resolve MongoDB server version.', { error: error.message });
    return null;
  } finally {
    await client.close();
  }
}

/**
 * Discover all farm databases dynamically from the MongoDB server.
 * @param {string} mongoUri - The MongoDB URI.
 * @returns {Promise<string[]>} An array of discovered farm database names.
 * @throws {ApiError} When database discovery fails.
 */
async function discoverFarmDatabases(mongoUri) {
  const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const admin = client.db().admin();
    const result = await admin.listDatabases();

    return result.databases
      .filter((database) => database.name.startsWith(FARM_DATABASE_PREFIX))
      .map((database) => database.name)
      .sort();
  } catch (error) {
    throw new ApiError(500, 'Unable to discover farm databases.', error);
  } finally {
    await client.close();
  }
}

/**
 * Normalize the requested backup target into a standard configuration object.
 * @param {string|object|null} target - The backup target or options object.
 * @param {object} options - Additional backup options.
 * @returns {object} Normalized backup configuration.
 */
/**
 * Resolve the database names that should be included in this backup.
 * @param {string} mongoUri - The MongoDB URI.
 * @param {object} backupConfig - The normalized backup configuration.
 * @returns {Promise<string[]>} The database names to back up.
 * @throws {ApiError} When the requested database cannot be resolved.
 */
async function resolveDatabasesToBackup(mongoUri, backupConfig) {
  const mainDatabaseName = resolveMainDatabaseName(mongoUri);

  if (backupConfig.targetType === 'main') {
    return [mainDatabaseName];
  }

  if (backupConfig.targetType === 'farm') {
    if (!backupConfig.farmId) {
      throw new ApiError(400, 'A farmId is required when backing up a specific farm database.');
    }

    return [`${FARM_DATABASE_PREFIX}${backupConfig.farmId}`];
  }

  if (backupConfig.targetType === 'all-farms') {
    const farmDatabases = await discoverFarmDatabases(mongoUri);
    if (!farmDatabases.length) {
      throw new ApiError(404, 'No farm databases were found to back up.');
    }

    return farmDatabases;
  }

  return [mainDatabaseName];
}

/**
 * Calculate a SHA-256 checksum for a directory tree.
 * @param {string} dirPath - The directory to hash.
 * @returns {Promise<string>} The SHA-256 checksum.
 */
async function calculateDirectoryChecksum(dirPath) {
  const hash = crypto.createHash('sha256');
  const entries = await listDirectoryEntries(dirPath);

  for (const entry of entries) {
    if (entry.name === 'metadata.json') {
      continue;
    }

    hash.update(entry.relativePath);
    hash.update(String(entry.size));
    hash.update(String(entry.mtimeMs));
  }

  return hash.digest('hex');
}

/**
 * Recursively list directory entries for hashing and size calculations.
 * @param {string} dirPath - The directory to scan.
 * @returns {Promise<Array>} The directory entries.
 */
async function listDirectoryEntries(dirPath) {
  const entries = [];
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'accent' }));

  for (const item of items) {
    const absolutePath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      entries.push(...await listDirectoryEntries(absolutePath));
      continue;
    }

    const stats = await fs.stat(absolutePath);
    entries.push({
      name: item.name,
      relativePath: path.relative(BACKUP_DIR, absolutePath),
      size: stats.size,
      mtimeMs: stats.mtimeMs
    });
  }

  return entries;
}

/**
 * Get the total size of a directory in bytes.
 * @param {string} dirPath - The directory to inspect.
 * @returns {Promise<number>} The directory size in bytes.
 */
async function getDirectorySize(dirPath) {
  let size = 0;
  const items = await fs.readdir(dirPath, { withFileTypes: true });

  for (const item of items) {
    const absolutePath = path.join(dirPath, item.name);
    const stats = await fs.stat(absolutePath);

    if (item.isDirectory()) {
      size += await getDirectorySize(absolutePath);
    } else {
      size += stats.size;
    }
  }

  return size;
}

/**
 * Verify that a backup directory has a stable checksum.
 * @param {string} backupPath - The backup directory path.
 * @param {string} expectedChecksum - The expected checksum value.
 * @returns {Promise<boolean>} True when the checksum matches.
 */
async function verifyBackupIntegrity(backupPath, expectedChecksum) {
  const checksum = await calculateDirectoryChecksum(backupPath);
  return checksum === expectedChecksum;
}

/**
 * Create a backup for the requested database target.
 * @param {string|object|null} target - The backup target or options object.
 * @param {object} options - Additional backup options.
 * @returns {Promise<object>} A standardized response object.
 */
async function createBackup(target = null, options = {}) {
  const backupConfig = normalizeBackupOptions(target, options);

  if (activeBackupOperation) {
    throw new ApiError(409, 'A backup operation is already in progress. Please wait for it to finish.');
  }

  return activeBackupOperation = (async () => {
    const mongoUri = validateMongoUri(process.env.MONGO_URI);
    const databasesToBackup = await resolveDatabasesToBackup(mongoUri, backupConfig);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${backupConfig.targetType}-${timestamp}`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    try {
      await ensureBackupDirectory();
      await fs.mkdir(backupPath, { recursive: true });

      logger.info('Starting backup operation.', {
        backupName,
        targetType: backupConfig.targetType,
        databases: databasesToBackup
      });

      for (const databaseName of databasesToBackup) {
        await runMongoTool('mongodump', ['--uri', mongoUri, '--db', databaseName, '--out', backupPath, '--gzip'], {
          // timeout: 1800000
        });
      }

      const metadata = {
        backupName,
        databaseName: databasesToBackup.length === 1 ? databasesToBackup[0] : 'multiple',
        farmId: backupConfig.targetType === 'farm' ? (backupConfig.farmId || 'unknown') : backupConfig.targetType === 'all-farms' ? 'all' : 'main',
        createdAt: new Date().toISOString(),
        size: await getDirectorySize(backupPath),
        checksum: await calculateDirectoryChecksum(backupPath),
        mongodbVersion: await getMongoServerVersion(mongoUri),
        compressed: true,
        targetType: backupConfig.targetType,
        databases: databasesToBackup
      };

      await fs.writeFile(path.join(backupPath, 'metadata.json'), JSON.stringify(metadata, null, 2));

      const isValid = await verifyBackupIntegrity(backupPath, metadata.checksum);
      if (!isValid) {
        throw new ApiError(500, 'Backup verification failed. The backup may be incomplete.');
      }

      logger.info('Backup created successfully.', { backupName, metadata });
      return {
        success: true,
        statusCode: 200,
        message: 'Backup created successfully.',
        data: {
          backupName,
          path: backupPath,
          metadata
        }
      };
    } catch (error) {
      logger.error('Backup creation failed.', { backupName, error: error.message });
      await fs.rm(backupPath, { recursive: true, force: true }).catch(() => {});
      throw error instanceof ApiError ? error : new ApiError(500, 'Backup creation failed.', error);
    } finally {
      activeBackupOperation = null;
    }
  })();
}

/**
 * List all available backups.
 * @returns {Promise<object[]>} The backup metadata entries.
 */
async function listBackups() {
  try {
    await ensureBackupDirectory();
    const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });

    const backups = await Promise.all(entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const backupPath = path.join(BACKUP_DIR, entry.name);
        const metadataPath = path.join(backupPath, 'metadata.json');

        let metadata = {};
        try {
          const fileContent = await fs.readFile(metadataPath, 'utf8');
          metadata = JSON.parse(fileContent);
        } catch (error) {
          logger.warn('Backup metadata is missing or unreadable.', { backupName: entry.name, error: error.message });
        }

        return {
          name: entry.name,
          ...metadata,
          path: backupPath
        };
      }));

    return backups.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } catch (error) {
    logger.error('Unable to list backups.', { error: error.message });
    return [];
  }
}

/**
 * Restore a backup from disk.
 * @param {string} backupName - The backup directory name.
 * @param {object} options - Optional restore settings.
 * @returns {Promise<object>} A standardized response object.
 */
async function restoreBackup(backupName, options = {}) {
  if (activeBackupOperation) {
    throw new ApiError(409, 'A backup operation is already in progress. Please wait for it to finish.');
  }

  return activeBackupOperation = (async () => {
    try {
      const backupPath = path.join(BACKUP_DIR, backupName);
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);

      if (!backupExists) {
        throw new ApiError(404, `Backup not found: ${backupName}`);
      }

      const mongoUri = validateMongoUri(process.env.MONGO_URI);
      await runMongoTool('mongorestore', ['--uri', mongoUri, '--dir', backupPath, '--drop', '--gzip'], {
        timeout: 1800000,
        signal: options.signal
      });

      logger.info('Backup restored successfully.', { backupName });
      return {
        success: true,
        statusCode: 200,
        message: `Backup ${backupName} restored successfully.`
      };
    } catch (error) {
      logger.error('Backup restore failed.', { backupName, error: error.message });
      throw error instanceof ApiError ? error : new ApiError(500, 'Backup restore failed.', error);
    } finally {
      activeBackupOperation = null;
    }
  })();
}

/**
 * Remove old backups while keeping the newest backups safe.
 * @param {number} daysToKeep - The retention window in days.
 * @param {number} keepLatest - The minimum number of recent backups to preserve.
 * @returns {Promise<object>} A standardized response object.
 */
async function cleanupOldBackups(daysToKeep = DEFAULT_BACKUP_RETENTION_DAYS, keepLatest = MINIMUM_BACKUPS_TO_KEEP) {
  try {
    await ensureBackupDirectory();
    const backups = await listBackups();
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const sortedBackups = [...backups].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const backupsToDelete = [];

    sortedBackups.forEach((backup, index) => {
      const createdAt = new Date(backup.createdAt || 0);
      const isProtected = index < keepLatest;
      if (!isProtected && createdAt < cutoffDate) {
        backupsToDelete.push(backup);
      }
    });

    for (const backup of backupsToDelete) {
      await fs.rm(path.join(BACKUP_DIR, backup.name), { recursive: true, force: true });
      logger.info('Deleted old backup.', { backupName: backup.name });
    }

    return {
      success: true,
      statusCode: 200,
      message: 'Backup cleanup completed.',
      data: {
        deleted: backupsToDelete.length,
        kept: sortedBackups.length - backupsToDelete.length
      }
    };
  } catch (error) {
    logger.error('Backup cleanup failed.', { error: error.message });
    throw error instanceof ApiError ? error : new ApiError(500, 'Backup cleanup failed.', error);
  }
}

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanupOldBackups,
  formatBytes
};
