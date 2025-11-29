const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/profiles");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Upload directory created:", uploadDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Get client IP
    const clientIP = req.ip || req.connection.remoteAddress;
    const cleanIP = clientIP.replace(/:/g, "-").replace(/\./g, "-");

    // Generate unique filename: IP_timestamp_originalname
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${cleanIP}_${timestamp}${ext}`;

    cb(null, filename);
  },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File size too large. Maximum size is 5MB",
      });
    }
    return res.status(400).json({
      error: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      error: err.message,
    });
  }
  next();
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;
