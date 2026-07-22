// models/SessionCredentials.js
// ─────────────────────────────────────────────
// Stores only the creds.json content for each WhatsApp session
// in a separate MongoDB collection so sessions survive restarts.
// ─────────────────────────────────────────────
'use strict';

const mongoose = require('mongoose');

const sessionCredentialsSchema = new mongoose.Schema(
    {
        /** Sanitized phone number (digits only), e.g. "917012984396" */
        number: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        /** Full contents of creds.json as a plain object */
        credsJson: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: true, // createdAt + updatedAt handled automatically
        collection: 'session_credentials', // explicit collection name
    }
);

const SessionCredentials = mongoose.model('SessionCredentials', sessionCredentialsSchema);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Save (upsert) creds.json for a given number.
 * @param {string} number      - Sanitized phone number
 * @param {Object} credsJson   - Parsed creds.json content
 * @returns {Promise<boolean>}
 */
async function saveSessionCreds(number, credsJson) {
    try {
        await SessionCredentials.findOneAndUpdate(
            { number },
            { number, credsJson },
            { upsert: true, returnDocument: 'after' }
        );
        console.log(`💾 [SessionDB] Saved creds for ${number}`);
        return true;
    } catch (err) {
        console.error(`❌ [SessionDB] Failed to save creds for ${number}:`, err.message);
        return false;
    }
}

/**
 * Load creds.json for a given number from MongoDB.
 * @param {string} number - Sanitized phone number
 * @returns {Promise<Object|null>} Parsed creds object, or null if not found
 */
async function loadSessionCreds(number) {
    try {
        const doc = await SessionCredentials.findOne({ number });
        return doc ? doc.credsJson : null;
    } catch (err) {
        console.error(`❌ [SessionDB] Failed to load creds for ${number}:`, err.message);
        return null;
    }
}

/**
 * Delete session creds from MongoDB (called on logout).
 * @param {string} number - Sanitized phone number
 * @returns {Promise<boolean>}
 */
async function deleteSessionCreds(number) {
    try {
        const result = await SessionCredentials.deleteOne({ number });
        if (result.deletedCount > 0) {
            console.log(`🗑️  [SessionDB] Deleted creds for ${number} from DB`);
        }
        return true;
    } catch (err) {
        console.error(`❌ [SessionDB] Failed to delete creds for ${number}:`, err.message);
        return false;
    }
}

/**
 * List all numbers that have saved credentials in MongoDB.
 * @returns {Promise<string[]>} Array of phone numbers
 */
async function listSavedNumbers() {
    try {
        const docs = await SessionCredentials.find({}, { number: 1 }).lean();
        return docs.map(d => d.number);
    } catch (err) {
        console.error('❌ [SessionDB] Failed to list saved numbers:', err.message);
        return [];
    }
}

module.exports = {
    SessionCredentials,
    saveSessionCreds,
    loadSessionCreds,
    deleteSessionCreds,
    listSavedNumbers,
};
