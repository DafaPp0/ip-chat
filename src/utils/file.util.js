const fs = require("fs");
const path = require("path");

const fileUtil = {
  /**
   * Read JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {any} - Parsed JSON data
   */
  readJSON(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      return null;
    }
  },

  /**
   * Write JSON file
   * @param {string} filePath - Path to JSON file
   * @param {any} data - Data to write
   * @param {boolean} pretty - Pretty print JSON (default: true)
   */
  writeJSON(filePath, data, pretty = true) {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const jsonString = pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      fs.writeFileSync(filePath, jsonString, "utf8");
      return true;
    } catch (error) {
      console.error(`Error writing JSON file ${filePath}:`, error);
      return false;
    }
  },

  /**
   * Append to JSON array file
   * @param {string} filePath - Path to JSON file
   * @param {any} item - Item to append
   */
  appendToJSONArray(filePath, item) {
    try {
      let array = this.readJSON(filePath);

      if (!Array.isArray(array)) {
        array = [];
      }

      array.push(item);
      return this.writeJSON(filePath, array);
    } catch (error) {
      console.error(`Error appending to JSON array ${filePath}:`, error);
      return false;
    }
  },

  /**
   * Initialize JSON file if it doesn't exist
   * @param {string} filePath - Path to JSON file
   * @param {any} defaultData - Default data (default: [])
   */
  initJSONFile(filePath, defaultData = []) {
    if (!fs.existsSync(filePath)) {
      this.writeJSON(filePath, defaultData);
      console.log(`Initialized JSON file: ${filePath}`);
    }
  },

  /**
   * Delete file
   * @param {string} filePath - Path to file
   */
  deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      return false;
    }
  },

  /**
   * Ensure directory exists
   * @param {string} dirPath - Path to directory
   */
  ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dirPath}`);
    }
  },

  /**
   * Get file size in bytes
   * @param {string} filePath - Path to file
   * @returns {number} - File size in bytes
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Check if file exists
   * @param {string} filePath - Path to file
   * @returns {boolean}
   */
  exists(filePath) {
    return fs.existsSync(filePath);
  },
};

module.exports = fileUtil;
