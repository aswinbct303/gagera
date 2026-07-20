// session_cleaner.js
// ─────────────────────────────────────────────────────────────────────────────
// Production-grade WhatsApp session folder cleaner.
//
// What it does:
//   - Scans ./session every 12 hours via node-cron.
//   - Finds all sub-folders matching the pattern  session_<digits>
//   - Inside each session folder it keeps ONLY  creds.json
//   - Deletes every other file and sub-folder recursively.
//   - Never deletes the session folder itself.
//   - Skips invalid / unreadable folders safely.
//
// Cron schedule: "0 */12 * * *"
//   Field 1 (minute)      : 0
//   Field 2 (hour)        : every 12 hours  (runs at 00:00 and 12:00 UTC)
//   Field 3 (day-of-month): *
//   Field 4 (month)       : *
//   Field 5 (day-of-week) : *
//
// Usage:
//   node session_cleaner.js          <- standalone
//   require('./session_cleaner')     <- imported from index.js / pair.js
//
// Install dependency:
//   npm install node-cron --save --legacy-peer-deps
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

const fs   = require('fs');
const path = require('path');
const cron = require('node-cron');

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

/** Absolute path to the root session directory */
const SESSION_ROOT = path.resolve(__dirname, 'session');

/** The only file that must be preserved inside every session folder */
const KEEP_FILE = 'creds.json';

/** Cron expression — runs at minute 0, every 12 hours (00:00 and 12:00) */
const CRON_SCHEDULE = '0 */12 * * *';

/** Prefix that valid session folders start with */
const SESSION_PREFIX = 'session_';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Returns a formatted timestamp string for log lines.
 * @returns {string}  e.g. "[2026-05-27 22:30:00]"
 */
function timestamp() {
    return `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}]`;
}

/**
 * Log shorthand helpers — prefix every line with [SessionCleaner].
 */
const log = {
    info:  (...a) => console.log( `${timestamp()} [SessionCleaner] ℹ️ `, ...a),
    ok:    (...a) => console.log( `${timestamp()} [SessionCleaner] ✅`, ...a),
    warn:  (...a) => console.warn(`${timestamp()} [SessionCleaner] ⚠️ `, ...a),
    error: (...a) => console.error(`${timestamp()} [SessionCleaner] ❌`, ...a),
    sep:   ()     => console.log( `${timestamp()} [SessionCleaner] ${'─'.repeat(60)}`),
};

// ─────────────────────────────────────────────
// Core cleaner
// ─────────────────────────────────────────────

/**
 * Recursively deletes a single filesystem entry (file or directory).
 * Uses fs.rmSync with { recursive: true, force: true } for reliability.
 *
 * @param {string} targetPath  Absolute path to the item to remove
 * @param {string} label       Human-readable label used in log output
 */
function deleteEntry(targetPath, label) {
    try {
        fs.rmSync(targetPath, { recursive: true, force: true });
        //log.ok(`  Deleted ${label}: ${path.basename(targetPath)}`);
    } catch (err) {
        log.error(`  Failed to delete ${label} "${path.basename(targetPath)}":`, err.message);
    }
}

/**
 * Cleans one session folder — removes everything except creds.json.
 *
 * @param {string} sessionDir  Absolute path to a session_<number> folder
 */
function cleanSessionFolder(sessionDir) {
    const folderName = path.basename(sessionDir);

    // ── Validate: the path must exist and be a directory ──────────────────
    let stat;
    try {
        stat = fs.statSync(sessionDir);
    } catch (err) {
        log.warn(`Skipping "${folderName}" — cannot stat:`, err.message);
        return;
    }

    if (!stat.isDirectory()) {
        log.warn(`Skipping "${folderName}" — not a directory.`);
        return;
    }

    // ── Read the directory contents ────────────────────────────────────────
    let entries;
    try {
        entries = fs.readdirSync(sessionDir, { withFileTypes: true });
    } catch (err) {
        log.error(`Skipping "${folderName}" — cannot read directory:`, err.message);
        return;
    }

    if (entries.length === 0) {
        log.info(`"${folderName}" is already empty — nothing to clean.`);
        return;
    }

    log.info(`Cleaning "${folderName}" (${entries.length} item(s) found)...`);

    let deletedCount = 0;
    let skippedCount = 0;

    for (const entry of entries) {
        const entryPath = path.join(sessionDir, entry.name);

        // ── Keep creds.json — skip it ──────────────────────────────────────
        if (entry.isFile() && entry.name === KEEP_FILE) {
            log.info(`  Keeping: ${entry.name}`);
            skippedCount++;
            continue;
        }

        // ── Delete everything else (files AND sub-directories) ─────────────
        const kind = entry.isDirectory() ? 'dir' : 'file';
        deleteEntry(entryPath, kind);
        deletedCount++;
    }

    //log.ok(`"${folderName}" — done. Deleted: ${deletedCount}, Kept: ${skippedCount}.`);
}

/**
 * Main entry point — scans SESSION_ROOT and cleans every valid session folder.
 */
function runCleanup() {
    log.sep();
    log.info('Starting session cleanup run...');

    // ── Validate root session directory ────────────────────────────────────
    if (!fs.existsSync(SESSION_ROOT)) {
        log.warn(`Session root "${SESSION_ROOT}" does not exist. Skipping.`);
        log.sep();
        return;
    }

    let rootEntries;
    try {
        rootEntries = fs.readdirSync(SESSION_ROOT, { withFileTypes: true });
    } catch (err) {
        log.error('Cannot read session root:', err.message);
        log.sep();
        return;
    }

    // ── Filter to folders matching  session_<digits> ───────────────────────
    const sessionFolders = rootEntries.filter(
        e => e.isDirectory() && e.name.startsWith(SESSION_PREFIX) && /^session_\d+$/.test(e.name)
    );

    if (sessionFolders.length === 0) {
        log.info('No valid session folders found. Nothing to clean.');
        log.sep();
        return;
    }

    log.info(`Found ${sessionFolders.length} session folder(s). Processing...`);

    let successCount = 0;
    let failCount    = 0;

    for (const folder of sessionFolders) {
        const fullPath = path.join(SESSION_ROOT, folder.name);
        try {
            cleanSessionFolder(fullPath);
            successCount++;
        } catch (unexpectedErr) {
            // Belt-and-suspenders: cleanSessionFolder has its own try-catch,
            // but we guard here too so one bad folder never aborts the rest.
            log.error(`Unexpected error while cleaning "${folder.name}":`, unexpectedErr.message);
            failCount++;
        }
    }

    log.sep();
    log.ok(`Cleanup complete — ${successCount} folder(s) cleaned, ${failCount} failed.`);
    log.sep();
}

// ─────────────────────────────────────────────
// Scheduler
// ─────────────────────────────────────────────

/**
 * Registers the node-cron job and also runs an immediate cleanup on startup
 * so you don't have to wait up to 12 hours for the first pass.
 */
function startSessionCleaner() {
    log.info(`Session cleaner initialised.`);
    //log.info(`Cron schedule: "${CRON_SCHEDULE}" — runs at 00:00 and 12:00 every day.`);
    //log.info(`Session root : ${SESSION_ROOT}`);
    //log.info(`Preserving   : ${KEEP_FILE} only.`);

    // ── Run immediately on startup ─────────────────────────────────────────
    log.info('Running initial cleanup on startup...');
    runCleanup();

    // ── Schedule subsequent runs every 12 hours ────────────────────────────
    cron.schedule(CRON_SCHEDULE, () => {
        log.info('Cron triggered — running scheduled cleanup...');
        runCleanup();
    }, {
        timezone: 'UTC', // keep behaviour consistent across server timezones
    });

    log.info('Cron job registered. Cleaner is active.');
}

// ─────────────────────────────────────────────
// Export  &  standalone mode
// ─────────────────────────────────────────────

// When required by another module (pair.js / index.js), call startSessionCleaner().
module.exports = { startSessionCleaner, runCleanup };

// When run directly (node session_cleaner.js), auto-start.
if (require.main === module) {
    startSessionCleaner();
}
