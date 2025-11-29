const path = require("path");
const fileUtil = require("../utils/file.util");
const crc32Util = require("../utils/crc32.util");

const MESSAGES_FILE = path.join(__dirname, "../../data/messages.json");

// Initialize messages file
fileUtil.initJSONFile(MESSAGES_FILE, []);

const messageService = {
  /**
   * Get messages with optional limit
   * @param {number} limit - Maximum number of messages to return
   * @returns {Array} - Array of messages
   */
  getMessages(limit = 100) {
    const messages = fileUtil.readJSON(MESSAGES_FILE) || [];

    // Return last 'limit' messages
    if (limit > 0 && messages.length > limit) {
      return messages.slice(-limit);
    }

    return messages;
  },

  /**
   * Get all messages
   * @returns {Array} - Array of all messages
   */
  getAllMessages() {
    return fileUtil.readJSON(MESSAGES_FILE) || [];
  },

  /**
   * Save new message
   * @param {object} messageData - Message data
   * @returns {object} - Saved message
   */
  async saveMessage(messageData) {
    const { message, crc, ip_client, username, photo } = messageData;

    if (!message || !crc || !ip_client) {
      throw new Error("Message, CRC, and IP are required");
    }

    // Verify CRC
    const isValid = this.verifyCRC(message, crc);
    if (!isValid) {
      throw new Error("CRC validation failed");
    }

    const messageObj = {
      id: this.generateMessageId(),
      message: message,
      crc: crc.toUpperCase(),
      ip_client: ip_client,
      username: username || `User_${ip_client}`,
      photo: photo || null,
      timestamp: new Date().toISOString(),
      crc_valid: true,
    };

    // Append to messages
    const success = fileUtil.appendToJSONArray(MESSAGES_FILE, messageObj);

    if (!success) {
      throw new Error("Failed to save message");
    }

    console.log(`Message saved: ${messageObj.id} from ${username}`);
    return messageObj;
  },

  /**
   * Calculate CRC32 for message
   * @param {string} message - Message text
   * @returns {string} - CRC32 checksum
   */
  calculateCRC(message) {
    return crc32Util.calculate(message);
  },

  /**
   * Verify CRC32 checksum
   * @param {string} message - Message text
   * @param {string} checksum - Expected checksum
   * @returns {boolean} - True if valid
   */
  verifyCRC(message, checksum) {
    return crc32Util.verify(message, checksum);
  },

  /**
   * Generate unique message ID
   * @returns {string} - Unique message ID
   */
  generateMessageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `msg_${timestamp}_${random}`;
  },

  /**
   * Get messages by IP address
   * @param {string} ipAddress - Client IP address
   * @returns {Array} - Array of messages from that IP
   */
  getMessagesByIP(ipAddress) {
    const messages = this.getAllMessages();
    return messages.filter((m) => m.ip_client === ipAddress);
  },

  /**
   * Get messages by username
   * @param {string} username - Username
   * @returns {Array} - Array of messages from that user
   */
  getMessagesByUsername(username) {
    const messages = this.getAllMessages();
    return messages.filter(
      (m) => m.username.toLowerCase() === username.toLowerCase()
    );
  },

  /**
   * Get messages in time range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} - Array of messages in range
   */
  getMessagesByTimeRange(startDate, endDate) {
    const messages = this.getAllMessages();
    return messages.filter((m) => {
      const msgDate = new Date(m.timestamp);
      return msgDate >= startDate && msgDate <= endDate;
    });
  },

  /**
   * Search messages by text
   * @param {string} query - Search query
   * @returns {Array} - Array of matching messages
   */
  searchMessages(query) {
    const messages = this.getAllMessages();
    const lowerQuery = query.toLowerCase();

    return messages.filter(
      (m) =>
        m.message.toLowerCase().includes(lowerQuery) ||
        m.username.toLowerCase().includes(lowerQuery)
    );
  },

  /**
   * Delete message by ID
   * @param {string} messageId - Message ID
   * @returns {boolean} - True if deleted
   */
  deleteMessage(messageId) {
    const messages = this.getAllMessages();
    const filteredMessages = messages.filter((m) => m.id !== messageId);

    if (filteredMessages.length < messages.length) {
      fileUtil.writeJSON(MESSAGES_FILE, filteredMessages);
      console.log(`Message deleted: ${messageId}`);
      return true;
    }

    return false;
  },

  /**
   * Clear all messages
   */
  clearMessages() {
    fileUtil.writeJSON(MESSAGES_FILE, []);
    console.log("All messages cleared");
  },

  /**
   * Get message statistics
   * @returns {object} - Statistics
   */
  getStats() {
    const messages = this.getAllMessages();

    const uniqueUsers = new Set(messages.map((m) => m.ip_client)).size;
    const totalCharacters = messages.reduce(
      (sum, m) => sum + m.message.length,
      0
    );
    const avgMessageLength =
      messages.length > 0 ? Math.round(totalCharacters / messages.length) : 0;

    const crcValid = messages.filter((m) => m.crc_valid === true).length;
    const crcInvalid = messages.length - crcValid;

    return {
      total: messages.length,
      uniqueUsers: uniqueUsers,
      totalCharacters: totalCharacters,
      averageLength: avgMessageLength,
      crcValid: crcValid,
      crcInvalid: crcInvalid,
      oldestMessage: messages.length > 0 ? messages[0].timestamp : null,
      newestMessage:
        messages.length > 0 ? messages[messages.length - 1].timestamp : null,
    };
  },

  /**
   * Validate message data
   * @param {object} messageData - Message data to validate
   * @returns {object} - Validation result
   */
  validateMessageData(messageData) {
    const errors = [];

    if (!messageData.message) {
      errors.push("Message is required");
    } else if (typeof messageData.message !== "string") {
      errors.push("Message must be a string");
    } else if (messageData.message.trim().length === 0) {
      errors.push("Message cannot be empty");
    } else if (messageData.message.length > 1000) {
      errors.push("Message is too long (max 1000 characters)");
    }

    if (!messageData.crc) {
      errors.push("CRC is required");
    }

    if (!messageData.ip_client) {
      errors.push("IP address is required");
    }

    // Verify CRC if both message and crc are present
    if (messageData.message && messageData.crc) {
      const isValid = this.verifyCRC(messageData.message, messageData.crc);
      if (!isValid) {
        errors.push("CRC validation failed");
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  /**
   * Clean up old messages (keep only last N messages)
   * @param {number} keepCount - Number of messages to keep
   * @returns {number} - Number of messages deleted
   */
  cleanupOldMessages(keepCount = 1000) {
    const messages = this.getAllMessages();

    if (messages.length <= keepCount) {
      return 0;
    }

    const messagesToKeep = messages.slice(-keepCount);
    const deletedCount = messages.length - messagesToKeep.length;

    fileUtil.writeJSON(MESSAGES_FILE, messagesToKeep);
    console.log(`Cleaned up ${deletedCount} old messages`);

    return deletedCount;
  },

  /**
   * Export messages to JSON
   * @param {string} filePath - Export file path
   * @returns {boolean} - True if successful
   */
  exportMessages(filePath) {
    const messages = this.getAllMessages();
    return fileUtil.writeJSON(filePath, messages);
  },
};

module.exports = messageService;
