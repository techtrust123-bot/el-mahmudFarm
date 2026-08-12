/**
 * Enterprise-grade Backup Job
 * - Configurable schedule
 * - Multi-tenant backup orchestration (main DB then farm DBs)
 * - Optional distributed locking (Redis) with in-memory fallback
 * - Retry with exponential backoff
 * - Compression/verification of archives
 * - Backup metadata stored in `BackupHistory` collection
 * - Audit logging and email notifications
 * - Manual trigger support via exported `runNow` function
 */

const cron = require('node-cron');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const AbortController = global.AbortController || require('abort-controller');

const backupService = require('../services/backupService');
const logger = require('../utils/logger');
const { createAuditLog } = require('../middleware/auditLogger');
const { sendNotification } = require('../services/emailService');
const BackupHistory = require('../models/backupHistory');
const ApiError = require('../utils/ApiError');

// Configuration via environment variables
const SCHEDULE_CRON = process.env.BACKUP_SCHEDULE_CRON || process.env.SCHEDULE_CRON || '0 2 * * *';
const CONCURRENCY = Math.max(1, Number(process.env.BACKUP_CONCURRENCY || 1));
const RETRY_MAX = Math.max(0, Number(process.env.BACKUP_RETRY_MAX || 3));
const RETRY_BASE_MS = Math.max(1000, Number(process.env.BACKUP_RETRY_BASE_MS || 2000));
const LOCK_KEY = process.env.BACKUP_LOCK_KEY || 'cloudfarm:backup:lock';
const LOCK_TTL_MS = Math.max(30_000, Number(process.env.BACKUP_LOCK_TTL_MS || 5 * 60 * 1000));
const RETENTION_DAYS = Math.max(1, Number(process.env.BACKUP_RETENTION_DAYS || 14));
const NOTIFY_ON_SUCCESS = (process.env.BACKUP_NOTIFY_ON_SUCCESS || 'false').toLowerCase() === 'true';
const NOTIFY_EMAILS = (process.env.BACKUP_NOTIFY_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

// Optional Redis distributed lock if REDIS_URL is present
let redisClient = null;
let usingRedis = false;
try {
  const Redis = require('ioredis');
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL);
    usingRedis = true;
    logger.info('Backup job: connected to Redis for distributed locking');
  }
} catch (e) {
  logger.info('Backup job: Redis not configured or ioredis not installed, using in-memory lock fallback');
}

// In-memory lock fallback
let inMemoryLock = { locked: false, expiresAt: 0 };

const acquireLock = async () => {
  if (usingRedis && redisClient) {
    const token = `${process.pid}-${Date.now()}`;
    const ok = await redisClient.set(LOCK_KEY, token, 'PX', LOCK_TTL_MS, 'NX');
    if (ok) return { mode: 'redis', token };
    return null;
  }

  // In-memory
  if (inMemoryLock.locked && Date.now() < inMemoryLock.expiresAt) return null;
  inMemoryLock.locked = true;
  inMemoryLock.expiresAt = Date.now() + LOCK_TTL_MS;
  return { mode: 'memory' };
};

const releaseLock = async (lock) => {
  try {
    if (!lock) return;
    if (lock.mode === 'redis' && redisClient) {
      // best-effort deletion; using token would be safer with a Lua script, but keep simple for now
      await redisClient.del(LOCK_KEY);
    } else {
      inMemoryLock.locked = false;
      inMemoryLock.expiresAt = 0;
    }
  } catch (err) {
    logger.warn('Failed to release backup lock', { error: err?.message });
  }
};

// Helper to sleep
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Directory and file helpers (keep small and memory-conscious)
const getDirectorySize = async (dir) => {
  let total = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) total += await getDirectorySize(p);
    else total += (await fs.stat(p)).size;
  }
  return total;
};

const compressWithTar = async (sourceDir, outFile) => {
  try {
    // Use system tar if available: works on Linux/macOS and modern Windows
    await execFileAsync('tar', ['-czf', outFile, '-C', sourceDir, '.']);
    return true;
  } catch (err) {
    logger.warn('tar compression failed or not available', { error: err?.message });
    return false;
  }
};

const verifyArchiveWithTar = async (archivePath) => {
  try {
    await execFileAsync('tar', ['-tzf', archivePath]);
    return true;
  } catch (err) {
    logger.warn('Archive verification failed', { archivePath, error: err?.message });
    return false;
  }
};

let shuttingDown = false;
const abortControllers = new Set();

process.on('SIGINT', () => { shuttingDown = true; logger.info('Backup job received SIGINT'); });
process.on('SIGTERM', () => { shuttingDown = true; logger.info('Backup job received SIGTERM'); });

/**
 * Execute a single backup attempt with retry/backoff and metadata recording.
 * Accepts `target` in the same shape as `backupService.createBackup` expects.
 */
const runSingleBackup = async (target, opts = {}) => {
  const start = Date.now();
  const record = new BackupHistory({ name: 'pending', path: '', targetType: 'multiple', databases: [] });
  await record.save().catch(() => {});

  const abortController = new AbortController();
  abortControllers.add(abortController);

  try {
    await createAuditLog('BACKUP_START', 'backup', { userId: null, farmId: null, req: null, status: 'RUNNING' });

    let attempt = 0;
    let lastError = null;
    while (attempt <= RETRY_MAX) {
      if (shuttingDown) throw new ApiError(503, 'Server shutting down, aborting backup');

      try {
        attempt++;
        logger.info('Starting backup attempt', { attempt, target });

        const result = await backupService.createBackup(target, { signal: abortController.signal });

        // result.data contains path and metadata per backupService contract
        const backupPath = result.data.path;
        const metadata = result.data.metadata || {};

        // Compress the folder into an archive file (tar.gz) if possible
        const archiveName = `${result.data.backupName || metadata.backupName}.tar.gz`;
        const archivePath = path.join(path.dirname(backupPath), archiveName);
        let compressed = false;
        try {
          compressed = await compressWithTar(backupPath, archivePath);
        } catch (err) {
          logger.warn('Compression step failed', { error: err?.message });
        }

        // Compute sizes and verify archive if created
        const dirSize = await getDirectorySize(backupPath);
        let archiveSize = compressed ? (await fs.stat(archivePath)).size : 0;
        let archiveVerified = true;
        if (compressed) {
          archiveVerified = await verifyArchiveWithTar(archivePath);
        }

        // update BackupHistory
        record.name = result.data.backupName || metadata.backupName || record._id.toString();
        record.path = backupPath;
        record.status = archiveVerified ? 'SUCCESS' : 'FAILED';
        record.targetType = metadata.targetType || target;
        record.farmId = metadata.farmId || null;
        record.databases = metadata.databases || [];
        record.durationMs = Date.now() - start;
        record.sizeBytes = dirSize;
        record.compressedBytes = archiveSize;
        record.checksum = metadata.checksum || null;
        record.mongodbVersion = metadata.mongodbVersion || null;
        record.finishedAt = new Date();
        record.error = archiveVerified ? null : { message: 'Archive verification failed' };
        await record.save();

        // audit and email
        await createAuditLog('BACKUP_SUCCESS', 'backup', { userId: null, farmId: record.farmId, req: null, status: 'SUCCESS' });
        if (NOTIFY_ON_SUCCESS && NOTIFY_EMAILS.length) {
          try {
            await Promise.all(NOTIFY_EMAILS.map(email => sendNotification(email, 'DAILY_SUMMARY', {
              userName: 'Admin',
              backupName: record.name,
              sizeBytes: record.sizeBytes,
              compressedBytes: record.compressedBytes,
              durationMs: record.durationMs
            })));
          } catch (e) {
            logger.warn('Failed to send backup success notifications', { error: e?.message });
          }
        }

        return { success: true, record };
      } catch (err) {
        lastError = err;
        logger.error('Backup attempt failed', { attempt, error: err?.message });
        if (attempt > RETRY_MAX) break;
        const backoff = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        logger.info('Retrying backup after backoff', { backoff });
        await sleep(backoff);
      }
    }

    // All attempts failed
    record.status = 'FAILED';
    record.error = { message: lastError?.message || 'Unknown error' };
    record.finishedAt = new Date();
    record.durationMs = Date.now() - start;
    await record.save().catch(() => {});

    await createAuditLog('BACKUP_FAILURE', 'backup', { userId: null, farmId: null, req: null, status: 'FAILED', error: lastError });
    // notify admins on failure
    if (NOTIFY_EMAILS.length) {
      try {
        await Promise.all(NOTIFY_EMAILS.map(email => sendNotification(email, 'UNUSUAL_EXPENSE', {
          userName: 'Admin',
          error: lastError?.message || 'Backup failed'
        })));
      } catch (e) {
        logger.warn('Failed to send backup failure notifications', { error: e?.message });
      }
    }

    throw lastError instanceof Error ? lastError : new ApiError(500, 'Backup failed after retries');
  } finally {
    abortControllers.delete(abortController);
  }
};

/**
 * Back up the main database first then farm databases.
 * Concurrency controls the number of parallel farm backups.
 */
const runAllBackups = async () => {
  const lock = await acquireLock();
  if (!lock) {
    logger.warn('Backup job skipped because lock could not be acquired');
    return;
  }

  const overallStart = Date.now();
  try {
    logger.info('Backup job starting', { concurrency: CONCURRENCY });

    // 1) main database
    await runSingleBackup('main');

    // 2) discover farms then back up each farm with concurrency
    const mongoUri = process.env.MONGO_URI;
    const farmDbs = await backupService.discoverFarmDatabases(mongoUri).catch((err) => {
      logger.warn('Failed to discover farm databases', { error: err?.message });
      return [];
    });

    if (farmDbs.length === 0) {
      logger.info('No farm databases found to back up');
    } else {
      // Convert 'farm_<id>' to farmId
      const farmIds = farmDbs.map((db) => db.replace(/^farm_/, ''));

      // Simple concurrency limiter
      const queue = farmIds.slice();
      const workers = new Array(Math.min(CONCURRENCY, queue.length)).fill(null).map(async () => {
        while (queue.length && !shuttingDown) {
          const farmId = queue.shift();
          try {
            await runSingleBackup({ targetType: 'farm', farmId });
          } catch (err) {
            logger.error('Farm backup failed', { farmId, error: err?.message });
          }
        }
      });

      await Promise.all(workers);
    }

    // 3) cleanup old backups according to retention policy
    try {
      const cleanup = await backupService.cleanupOldBackups(RETENTION_DAYS);
      logger.info('Backup cleanup completed', { result: cleanup });
      await createAuditLog('CLEANUP', 'backup', { status: 'SUCCESS' });
    } catch (err) {
      logger.warn('Backup cleanup failed', { error: err?.message });
      await createAuditLog('CLEANUP', 'backup', { status: 'FAILED', error: err });
    }

    const overallDuration = Date.now() - overallStart;
    logger.info('Backup job completed', { totalDurationMs: overallDuration });
    return { success: true };
  } finally {
    await releaseLock(lock);
  }
};

/**
 * Manual trigger API - reuses same orchestration.
 */
const runNow = async () => {
  if (shuttingDown) throw new ApiError(503, 'Server is shutting down');
  return runAllBackups();
};

// Schedule the cron job
let scheduledJob = null;
try {
  scheduledJob = cron.schedule(SCHEDULE_CRON, async () => {
    if (shuttingDown) return logger.info('Skipping scheduled backup (shutting down)');
    try {
      await runAllBackups();
    } catch (err) {
      logger.error('Scheduled backup run failed', { error: err?.message });
    }
  });
  logger.info('Backup scheduler configured', { schedule: SCHEDULE_CRON });
} catch (e) {
  logger.error('Failed to schedule backups', { error: e?.message });
}

module.exports = { runNow, scheduledJob };

