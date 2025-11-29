const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const authMiddleware = require("./middleware/auth.middleware");
const uploadMiddleware = require("./middleware/upload.middleware");
const profileService = require("./services/profile.service");
const messageService = require("./services/message.service");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO dengan konfigurasi yang benar
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "../public")));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Store connected users
const connectedUsers = new Map();

// API Routes
// ============================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    users: connectedUsers.size,
  });
});

// Profile Routes
// ============================================

// Check if profile exists for current IP
app.get("/api/profile/check", (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress;
    const profile = profileService.getProfileByIP(clientIP);

    if (profile) {
      res.json({
        exists: true,
        profile: profile,
      });
    } else {
      res.json({
        exists: false,
        profile: null,
      });
    }
  } catch (error) {
    console.error("Error checking profile:", error);
    res.status(500).json({
      error: "Failed to check profile",
    });
  }
});

// Setup user profile
app.post(
  "/api/profile/setup",
  uploadMiddleware.single("photo"),
  async (req, res) => {
    try {
      const clientIP = req.ip || req.connection.remoteAddress;
      const { username } = req.body;

      if (!username || username.trim().length === 0) {
        return res.status(400).json({
          error: "Username is required",
        });
      }

      if (username.length > 20) {
        return res.status(400).json({
          error: "Username must be 20 characters or less",
        });
      }

      let photoPath = null;
      if (req.file) {
        photoPath = `/uploads/profiles/${req.file.filename}`;
      }

      const profile = await profileService.createOrUpdateProfile({
        ip_client: clientIP,
        username: username.trim(),
        photo: photoPath,
      });

      res.json({
        success: true,
        profile: profile,
      });
    } catch (error) {
      console.error("Error setting up profile:", error);
      res.status(500).json({
        error: "Failed to setup profile",
      });
    }
  }
);

// Get all profiles
app.get("/api/profiles", (req, res) => {
  try {
    const profiles = profileService.getAllProfiles();
    res.json({
      success: true,
      profiles: profiles,
    });
  } catch (error) {
    console.error("Error getting profiles:", error);
    res.status(500).json({
      error: "Failed to get profiles",
    });
  }
});

// Message Routes
// ============================================

// Get chat history
app.get("/api/messages", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const messages = messageService.getMessages(limit);

    res.json({
      success: true,
      messages: messages,
    });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({
      error: "Failed to get messages",
    });
  }
});

// Clear all messages (for testing)
app.delete("/api/messages", (req, res) => {
  try {
    messageService.clearMessages();
    res.json({
      success: true,
      message: "All messages cleared",
    });
  } catch (error) {
    console.error("Error clearing messages:", error);
    res.status(500).json({
      error: "Failed to clear messages",
    });
  }
});

// Socket.IO Event Handlers
// ============================================

io.on("connection", (socket) => {
  // Better IP extraction
  let clientIP =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address ||
    socket.conn.remoteAddress;

  // Clean IPv6 prefix
  if (clientIP && clientIP.substr(0, 7) === "::ffff:") {
    clientIP = clientIP.substr(7);
  }

  console.log(
    `[${new Date().toISOString()}] Client connected: ${clientIP} (${socket.id})`
  );

  // Get user profile
  const profile = profileService.getProfileByIP(clientIP);

  if (!profile) {
    console.log(`No profile found for ${clientIP}`);
    socket.emit("profile_required", {
      message: "Profile not found. Please setup your profile first.",
      ip: clientIP,
    });
    // Don't disconnect, let them setup profile
    // return;
  }

  // Add to connected users
  const userInfo = {
    socketId: socket.id,
    ip_client: clientIP,
    username: profile ? profile.username : `User_${clientIP}`,
    photo: profile ? profile.photo : null,
    connected_at: new Date().toISOString(),
  };

  connectedUsers.set(socket.id, userInfo);

  // Update profile last active if exists
  if (profile) {
    profileService.updateLastActive(clientIP);
  }

  // Notify others that user joined
  if (profile) {
    socket.broadcast.emit("user_joined", {
      ip_client: clientIP,
      username: profile.username,
      photo: profile.photo,
      timestamp: new Date().toISOString(),
    });
  }

  // Send current members list to new user
  const members = Array.from(connectedUsers.values()).map((user) => ({
    ip_client: user.ip_client,
    username: user.username,
    photo: user.photo,
  }));

  socket.emit("members_update", { members });

  // Broadcast updated members list to all
  io.emit("members_update", { members });

  // Send chat history to new user
  const messages = messageService.getMessages(50);
  socket.emit("chat_history", { messages });

  console.log(
    `Connected users: ${connectedUsers.size}, Members emitted: ${members.length}`
  );

  // Handle send message
  socket.on("send_message", async (data) => {
    try {
      console.log("Received message:", data);

      const { message, crc, username, photo } = data;

      if (!message || !crc) {
        console.error("Invalid message data");
        socket.emit("message_error", { error: "Invalid message data" });
        return;
      }

      // Verify CRC
      const isValid = messageService.verifyCRC(message, crc);

      if (!isValid) {
        console.error("CRC validation failed");
        socket.emit("message_error", { error: "CRC validation failed" });
        return;
      }

      // Get current user info
      const currentUser = connectedUsers.get(socket.id);
      const userProfile = profileService.getProfileByIP(clientIP);

      // Save message
      const savedMessage = await messageService.saveMessage({
        message: message,
        crc: crc,
        ip_client: clientIP,
        username:
          username ||
          (userProfile ? userProfile.username : currentUser.username),
        photo: photo || (userProfile ? userProfile.photo : currentUser.photo),
      });

      console.log(`Message saved and broadcasting: ${savedMessage.id}`);

      // Broadcast to all clients (including sender)
      io.emit("message", savedMessage);

      console.log(
        `[${new Date().toISOString()}] Message from ${
          savedMessage.username
        }: ${message.substring(0, 50)}...`
      );
    } catch (error) {
      console.error("Error handling message:", error);
      socket.emit("message_error", {
        error: "Failed to send message: " + error.message,
      });
    }
  });

  // Handle typing indicator
  socket.on("typing", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit("typing", {
        ip_client: user.ip_client,
        username: user.username,
      });
    }
  });

  socket.on("stop_typing", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit("stop_typing", {
        ip_client: user.ip_client,
        username: user.username,
      });
    }
  });

  // Handle get history request
  socket.on("get_history", () => {
    const messages = messageService.getMessages(50);
    socket.emit("chat_history", { messages });
    console.log(`Sent ${messages.length} messages to ${socket.id}`);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(
      `[${new Date().toISOString()}] Client disconnected: ${clientIP} (${
        socket.id
      })`
    );

    // Remove from connected users
    const user = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);

    if (user) {
      // Notify others that user left
      socket.broadcast.emit("user_left", {
        ip_client: user.ip_client,
        username: user.username,
        timestamp: new Date().toISOString(),
      });

      // Update members list
      const members = Array.from(connectedUsers.values()).map((u) => ({
        ip_client: u.ip_client,
        username: u.username,
        photo: u.photo,
      }));

      io.emit("members_update", { members });
    }
  });
});

// Main route - serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0"; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
  console.log("==========================================");
  console.log("🚀 Local Chat Server Started");
  console.log("==========================================");
  console.log(`📡 Server running on: http://${HOST}:${PORT}`);
  console.log(`🌐 Access from network: http://[YOUR_LOCAL_IP]:${PORT}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log("==========================================");
  console.log("📝 Available endpoints:");
  console.log(`   GET  /                      - Main chat page`);
  console.log(`   GET  /api/health            - Health check`);
  console.log(`   GET  /api/profile/check     - Check profile`);
  console.log(`   POST /api/profile/setup     - Setup profile`);
  console.log(`   GET  /api/profiles          - Get all profiles`);
  console.log(`   GET  /api/messages          - Get messages`);
  console.log(`   DEL  /api/messages          - Clear messages`);
  console.log("==========================================");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received. Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
