// IP-based Authentication Middleware
const authMiddleware = {
  // Extract and normalize client IP
  getClientIP(req) {
    let ip =
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    // Remove IPv6 prefix if present
    if (ip && ip.substr(0, 7) === "::ffff:") {
      ip = ip.substr(7);
    }

    // Handle localhost
    if (ip === "::1" || ip === "127.0.0.1") {
      ip = "localhost";
    }

    return ip;
  },

  // Middleware to attach client IP to request
  attachClientIP(req, res, next) {
    req.clientIP = authMiddleware.getClientIP(req);
    next();
  },

  // Validate IP format (basic validation)
  isValidIP(ip) {
    if (ip === "localhost") return true;

    // IPv4 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split(".");
      return parts.every((part) => {
        const num = parseInt(part);
        return num >= 0 && num <= 255;
      });
    }

    // IPv6 validation (basic)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4}$/;
    return ipv6Regex.test(ip);
  },

  // Format IP for display
  formatIPForDisplay(ip) {
    if (ip === "localhost") {
      return "localhost";
    }

    // Remove IPv6 prefix
    if (ip && ip.substr(0, 7) === "::ffff:") {
      return ip.substr(7);
    }

    return ip;
  },

  // Generate username from IP if needed
  generateUsernameFromIP(ip) {
    const formattedIP = this.formatIPForDisplay(ip);
    return `User_${formattedIP.replace(/\./g, "_").replace(/:/g, "_")}`;
  },
};

module.exports = authMiddleware;
