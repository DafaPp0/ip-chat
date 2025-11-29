const path = require("path");
const fs = require("fs");
const fileUtil = require("../utils/file.util");

const BACKUP_DIR = path.join(__dirname, "../../data/backups");

// Ensure backup directory exists
fileUtil.ensureDir(BACKUP_DIR);

const storageService = {
  /**
   * Create backup of all data
   * @returns {object} - Backup info
   */
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);

      fileUtil.ensureDir(backupPath);

      // Backup profiles
      const profilesFile = path.join(__dirname, "../../data/profiles.json");
      if (fileUtil.exists(profilesFile)) {
        const profiles = fileUtil.readJSON(profilesFile);
        fileUtil.writeJSON(path.join(backupPath, "profiles.json"), profiles);
      }

      // Backup messages
      const messagesFile = path.join(__dirname, "../../data/messages.json");
      if (fileUtil.exists(messagesFile)) {
        const messages = fileUtil.readJSON(messagesFile);
        fileUtil.writeJSON(path.join(backupPath, "messages.json"), messages);
      }

      // Create backup info file
      const backupInfo = {
        timestamp: new Date().toISOString(),
        files: ["profiles.json", "messages.json"],
        path: backupPath,
      };

      fileUtil.writeJSON(path.join(backupPath, "backup_info.json"), backupInfo);

      console.log(`Backup created: ${backupPath}`);
      return backupInfo;
    } catch (error) {
      console.error("Error creating backup:", error);
      throw error;
    }
  },

  /**
   * Restore from backup
   * @param {string} backupName - Backup directory name
   * @returns {boolean} - True if successful
   */
  restoreBackup(backupName) {
    try {
      const backupPath = path.join(BACKUP_DIR, backupName);

      if (!fs.existsSync(backupPath)) {
        throw new Error("Backup not found");
      }

      // Restore profiles
      const profilesBackup = path.join(backupPath, "profiles.json");
      if (fileUtil.exists(profilesBackup)) {
        const profiles = fileUtil.readJSON(profilesBackup);
        const profilesFile = path.join(__dirname, "../../data/profiles.json");
        fileUtil.writeJSON(profilesFile, profiles);
      }

      // Restore messages
      const messagesBackup = path.join(backupPath, "messages.json");
      if (fileUtil.exists(messagesBackup)) {
        const messages = fileUtil.readJSON(messagesBackup);
        const messagesFile = path.join(__dirname, "../../data/messages.json");
        fileUtil.writeJSON(messagesFile, messages);
      }

      console.log(`Backup restored from: ${backupPath}`);
      return true;
    } catch (error) {
      console.error("Error restoring backup:", error);
      throw error;
    }
  },

  /**
   * List all backups
   * @returns {Array} - Array of backup info
   */
  listBackups() {
    try {
      if (!fs.existsSync(BACKUP_DIR)) {
        return [];
      }

      const backups = fs
        .readdirSync(BACKUP_DIR)
        .filter((name) => name.startsWith("backup_"))
        .map((name) => {
          const backupPath = path.join(BACKUP_DIR, name);
          const infoFile = path.join(backupPath, "backup_info.json");

          if (fileUtil.exists(infoFile)) {
            return fileUtil.readJSON(infoFile);
          }

          return {
            name: name,
            path: backupPath,
          };
        });

      return backups;
    } catch (error) {
      console.error("Error listing backups:", error);
      return [];
    }
  },

  /**
   * Delete backup
   * @param {string} backupName - Backup directory name
   * @returns {boolean} - True if deleted
   */
  deleteBackup(backupName) {
    try {
      const backupPath = path.join(BACKUP_DIR, backupName);

      if (!fs.existsSync(backupPath)) {
        return false;
      }

      // Delete backup directory recursively
      fs.rmSync(backupPath, { recursive: true, force: true });
      console.log(`Backup deleted: ${backupPath}`);
      return true;
    } catch (error) {
      console.error("Error deleting backup:", error);
      return false;
    }
  },

  /**
   * Get storage statistics
   * @returns {object} - Storage stats
   */
  getStorageStats() {
    const profilesFile = path.join(__dirname, "../../data/profiles.json");
    const messagesFile = path.join(__dirname, "../../data/messages.json");

    return {
      profiles: {
        exists: fileUtil.exists(profilesFile),
        size: fileUtil.getFileSize(profilesFile),
        count: fileUtil.exists(profilesFile)
          ? fileUtil.readJSON(profilesFile).length
          : 0,
      },
      messages: {
        exists: fileUtil.exists(messagesFile),
        size: fileUtil.getFileSize(messagesFile),
        count: fileUtil.exists(messagesFile)
          ? fileUtil.readJSON(messagesFile).length
          : 0,
      },
      backups: {
        count: this.listBackups().length,
        directory: BACKUP_DIR,
      },
    };
  },
};

module.exports = storageService;
