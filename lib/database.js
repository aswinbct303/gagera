const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB
 * @returns {Promise<boolean>} Connection status
 */
async function connectDatabase() {
    if (isConnected) {
        console.log('📦 Using existing MongoDB connection');
        return true;
    }
    
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/whatsapp-bot';
    
    try {
        await mongoose.connect(MONGODB_URI);
        
        isConnected = true;
        console.log('✅ MongoDB connected successfully');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('⚠️  Falling back to file-based config');
        return false;
    }
}

/**
 * Get connection status
 * @returns {boolean}
 */
function getConnectionStatus() {
    return isConnected && mongoose.connection.readyState === 1;
}

/**
 * Disconnect from MongoDB
 */
async function disconnectDatabase() {
    if (!isConnected) return;
    
    try {
        await mongoose.disconnect();
        isConnected = false;
        console.log('MongoDB disconnected');
    } catch (error) {
        console.error('Error disconnecting from MongoDB:', error);
    }
}

module.exports = {
    connectDatabase,
    getConnectionStatus,
    disconnectDatabase,
    mongoose
};
