const path = require("path");
const fileUtil = require("../utils/file.util");

const PROFILES_FILE = path.join(__dirname, "../../data/profiles.json");

// Initialize profiles file
fileUtil.initJSONFile(PROFILES_FILE, []);

const profileService = {
  /**
   * Get all profiles
   * @returns {Array} - Array of profiles
   */
  getAllProfiles() {
    return fileUtil.readJSON(PROFILES_FILE) || [];
  },

  /**
   * Get profile by IP address
   * @param {string} ipAddress - Client IP address
   * @returns {object|null} - Profile object or null
   */
  getProfileByIP(ipAddress) {
    const profiles = this.getAllProfiles();
    return profiles.find((p) => p.ip_client === ipAddress) || null;
  },

  /**
   * Create or update user profile
   * @param {object} profileData - Profile data
   * @returns {object} - Created/updated profile
   */
  createOrUpdateProfile(profileData) {
    const { ip_client, username, photo } = profileData;

    if (!ip_client || !username) {
      throw new Error("IP address and username are required");
    }

    const profiles = this.getAllProfiles();
    const existingIndex = profiles.findIndex((p) => p.ip_client === ip_client);

    const profileObj = {
      ip_client: ip_client,
      username: username,
      photo: photo || null,
      last_active: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      // Update existing profile
      profileObj.created_at = profiles[existingIndex].created_at;
      profiles[existingIndex] = profileObj;
    } else {
      // Create new profile
      profileObj.created_at = new Date().toISOString();
      profiles.push(profileObj);
    }

    // Save to file
    fileUtil.writeJSON(PROFILES_FILE, profiles);

    console.log(
      `Profile ${
        existingIndex >= 0 ? "updated" : "created"
      } for ${username} (${ip_client})`
    );
    return profileObj;
  },

  /**
   * Update last active timestamp
   * @param {string} ipAddress - Client IP address
   */
  updateLastActive(ipAddress) {
    const profiles = this.getAllProfiles();
    const index = profiles.findIndex((p) => p.ip_client === ipAddress);

    if (index >= 0) {
      profiles[index].last_active = new Date().toISOString();
      fileUtil.writeJSON(PROFILES_FILE, profiles);
    }
  },

  /**
   * Delete profile by IP
   * @param {string} ipAddress - Client IP address
   * @returns {boolean} - True if deleted
   */
  deleteProfile(ipAddress) {
    const profiles = this.getAllProfiles();
    const filteredProfiles = profiles.filter((p) => p.ip_client !== ipAddress);

    if (filteredProfiles.length < profiles.length) {
      fileUtil.writeJSON(PROFILES_FILE, filteredProfiles);
      console.log(`Profile deleted for ${ipAddress}`);
      return true;
    }

    return false;
  },

  /**
   * Check if username is taken (by another IP)
   * @param {string} username - Username to check
   * @param {string} excludeIP - IP to exclude from check
   * @returns {boolean}
   */
  isUsernameTaken(username, excludeIP = null) {
    const profiles = this.getAllProfiles();
    return profiles.some(
      (p) =>
        p.username.toLowerCase() === username.toLowerCase() &&
        p.ip_client !== excludeIP
    );
  },

  /**
   * Get active profiles (active in last 24 hours)
   * @returns {Array} - Array of active profiles
   */
  getActiveProfiles() {
    const profiles = this.getAllProfiles();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    return profiles.filter((p) => {
      const lastActive = new Date(p.last_active);
      return lastActive > oneDayAgo;
    });
  },

  /**
   * Clean up old profiles (not active in 30 days)
   * @returns {number} - Number of profiles deleted
   */
  cleanupOldProfiles() {
    const profiles = this.getAllProfiles();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const activeProfiles = profiles.filter((p) => {
      const lastActive = new Date(p.last_active);
      return lastActive > thirtyDaysAgo;
    });

    const deletedCount = profiles.length - activeProfiles.length;

    if (deletedCount > 0) {
      fileUtil.writeJSON(PROFILES_FILE, activeProfiles);
      console.log(`Cleaned up ${deletedCount} old profiles`);
    }

    return deletedCount;
  },

  /**
   * Get profile statistics
   * @returns {object} - Statistics
   */
  getStats() {
    const profiles = this.getAllProfiles();
    const activeProfiles = this.getActiveProfiles();

    return {
      total: profiles.length,
      active: activeProfiles.length,
      withPhoto: profiles.filter((p) => p.photo).length,
      withoutPhoto: profiles.filter((p) => !p.photo).length,
    };
  },
};

module.exports = profileService;
