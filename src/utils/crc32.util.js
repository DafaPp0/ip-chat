const CRC32 = require("crc-32");

const crc32Util = {
  /**
   * Calculate CRC32 checksum for a string
   * @param {string} str - Input string
   * @returns {string} - Binary CRC32 checksum (32-bit)
   */
  calculate(str) {
    if (typeof str !== "string") {
      throw new Error("Input must be a string");
    }

    const crc = CRC32.str(str);
    // Convert to unsigned 32-bit and format as binary
    const unsigned = crc >>> 0;
    return unsigned.toString(2).padStart(32, "0");
  },

  /**
   * Verify CRC32 checksum
   * @param {string} str - Original string
   * @param {string} checksum - Expected checksum (binary)
   * @returns {boolean} - True if checksum matches
   */
  verify(str, checksum) {
    if (typeof str !== "string" || typeof checksum !== "string") {
      return false;
    }

    const calculated = this.calculate(str);
    return calculated === checksum;
  },

  /**
   * Calculate CRC32 for buffer
   * @param {Buffer} buffer - Input buffer
   * @returns {string} - Binary CRC32 checksum (32-bit)
   */
  calculateBuffer(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error("Input must be a Buffer");
    }

    const crc = CRC32.buf(buffer);
    const unsigned = crc >>> 0;
    return unsigned.toString(2).padStart(32, "0");
  },

  /**
   * Get CRC32 info for debugging
   * @param {string} str - Input string
   * @returns {object} - CRC32 details
   */
  getInfo(str) {
    const crc = CRC32.str(str);
    const unsigned = crc >>> 0;

    return {
      input: str,
      inputLength: str.length,
      crcSigned: crc,
      crcUnsigned: unsigned,
      hex: unsigned.toString(16).toUpperCase(),
      binary: unsigned.toString(2).padStart(32, "0"),
    };
  },
};

module.exports = crc32Util;
