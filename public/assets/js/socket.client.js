// Socket.IO Client Manager
const SocketManager = {
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,

  init() {
    this.connect();
    this.setupEventListeners();
  },

  connect() {
    // Connect to WebSocket server
    this.socket = io({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupSocketEvents();
  },

  setupSocketEvents() {
    // Connection events
    this.socket.on("connect", () => {
      console.log("Connected to server");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from server");
      this.isConnected = false;
      this.updateConnectionStatus(false);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.showToast(
          "Failed to connect to server. Please refresh the page.",
          "error"
        );
      }
    });

    // Chat events
    this.socket.on("user_joined", (data) => {
      this.handleUserJoined(data);
    });

    this.socket.on("user_left", (data) => {
      this.handleUserLeft(data);
    });

    this.socket.on("message", (data) => {
      this.handleNewMessage(data);
    });

    this.socket.on("typing", (data) => {
      this.handleTyping(data);
    });

    this.socket.on("stop_typing", (data) => {
      this.handleStopTyping(data);
    });

    this.socket.on("members_update", (data) => {
      this.handleMembersUpdate(data);
    });

    this.socket.on("message_error", (data) => {
      this.handleMessageError(data);
    });

    this.socket.on("chat_history", (data) => {
      this.handleChatHistory(data);
    });
  },

  setupEventListeners() {
    // Will be implemented by ChatApp
  },

  // Send message with CRC
  sendMessage(message, profile) {
    if (!this.isConnected) {
      this.showToast("Not connected to server", "error");
      return false;
    }

    // Calculate CRC32
    const crc = crc32.calculate(message);

    const messageData = {
      message: message,
      crc: crc,
      username: profile.username,
      photo: profile.photo,
      timestamp: new Date().toISOString(),
    };

    this.socket.emit("send_message", messageData);
    return true;
  },

  // Send typing indicator
  sendTyping(isTyping) {
    if (!this.isConnected) return;

    if (isTyping) {
      this.socket.emit("typing");
    } else {
      this.socket.emit("stop_typing");
    }
  },

  // Request chat history
  requestChatHistory() {
    if (!this.isConnected) return;
    this.socket.emit("get_history");
  },

  // Event handlers (to be called by ChatApp)
  handleUserJoined(data) {
    if (window.ChatApp) {
      window.ChatApp.onUserJoined(data);
    }
  },

  handleUserLeft(data) {
    if (window.ChatApp) {
      window.ChatApp.onUserLeft(data);
    }
  },

  handleNewMessage(data) {
    // Verify CRC
    const isValid = crc32.verify(data.message, data.crc);

    if (window.ChatApp) {
      window.ChatApp.onNewMessage(data, isValid);
    }
  },

  handleTyping(data) {
    if (window.ChatApp) {
      window.ChatApp.onTyping(data);
    }
  },

  handleStopTyping(data) {
    if (window.ChatApp) {
      window.ChatApp.onStopTyping(data);
    }
  },

  handleMembersUpdate(data) {
    if (window.ChatApp) {
      window.ChatApp.onMembersUpdate(data);
    }
  },

  handleMessageError(data) {
    this.showToast(data.error || "Failed to send message", "error");
  },

  handleChatHistory(data) {
    if (window.ChatApp) {
      window.ChatApp.onChatHistory(data.messages);
    }
  },

  updateConnectionStatus(isConnected) {
    // Update UI to show connection status
    const statusElements = document.querySelectorAll(".connection-status");
    statusElements.forEach((el) => {
      if (isConnected) {
        el.classList.remove("text-red-400");
        el.classList.add("text-green-400");
        el.textContent = "Online";
      } else {
        el.classList.remove("text-green-400");
        el.classList.add("text-red-400");
        el.textContent = "Offline";
      }
    });
  },

  showToast(message, type = "info") {
    if (window.ProfileManager) {
      window.ProfileManager.showToast(message, type);
    }
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Wait for profile to be set before connecting
  setTimeout(() => {
    SocketManager.init();
  }, 500);
});
