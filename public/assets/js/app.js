// Main Chat Application
const ChatApp = {
  currentProfile: null,
  members: new Map(),
  typingUsers: new Set(),
  typingTimeout: null,

  init() {
    this.setupEventListeners();
    this.setupMembersModal();
  },

  setupMembersModal() {
    const showBtn = document.getElementById("showMembersBtn");
    const closeBtn = document.getElementById("closeMembersModal");
    const modal = document.getElementById("membersModal");
    const modalContent = document.getElementById("membersModalContent");
    const backdrop = document.getElementById("membersModalBackdrop");

    // Show modal with animation
    const showModal = () => {
      modal.classList.remove("hidden");

      // Trigger animation after a brief delay
      requestAnimationFrame(() => {
        modalContent.classList.remove("scale-95", "opacity-0");
        modalContent.classList.add("scale-100", "opacity-100");
      });
    };

    // Hide modal with animation
    const hideModal = () => {
      modalContent.classList.remove("scale-100", "opacity-100");
      modalContent.classList.add("scale-95", "opacity-0");

      // Wait for animation to complete before hiding
      setTimeout(() => {
        modal.classList.add("hidden");
      }, 300);
    };

    // Event listeners
    showBtn.addEventListener("click", () => {
      showModal();
      // Update modal members list when opened
      this.updateModalMembers();
    });

    closeBtn.addEventListener("click", hideModal);
    backdrop.addEventListener("click", hideModal);

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        hideModal();
      }
    });
  },

  updateModalMembers() {
    const modalMembersList = document.getElementById("modalMembersList");
    const modalOnlineCount = document.getElementById("modalOnlineCount");
    const modalCurrentUserName = document.getElementById(
      "modalCurrentUserName"
    );
    const modalCurrentUserAvatar = document.getElementById(
      "modalCurrentUserAvatar"
    );

    // Check if elements exist (modal might not be in DOM yet)
    if (!modalMembersList || !modalOnlineCount) {
      console.log("⚠️ Modal elements not found, skipping update");
      return;
    }

    // Update count
    modalOnlineCount.textContent = this.members.size;

    // Update current user
    if (this.currentProfile && modalCurrentUserName && modalCurrentUserAvatar) {
      modalCurrentUserName.textContent = this.currentProfile.username;
      if (this.currentProfile.photo) {
        const img = modalCurrentUserAvatar.querySelector("img");
        if (img) {
          img.src = this.currentProfile.photo;
        }
      } else {
        modalCurrentUserAvatar.innerHTML = `<span class="text-lg font-semibold">${this.currentProfile.username
          .charAt(0)
          .toUpperCase()}</span>`;
      }
    }

    // Update members list
    if (this.members.size === 0) {
      modalMembersList.innerHTML = `
                <div class="text-center py-8">
                    <div class="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <p class="text-sm text-gray-500">No other members online</p>
                </div>
            `;
      return;
    }

    modalMembersList.innerHTML = "";
    this.members.forEach((member, ip) => {
      const isCurrentUser = ip === this.getClientIP();
      const memberHTML = `
                <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-800/50 transition-all duration-200 group">
                    <div class="relative flex-shrink-0">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-indigo-500/30 transition-all">
                            ${
                              member.photo
                                ? `<img src="${member.photo}" alt="${member.username}" class="w-full h-full object-cover object-center">`
                                : `<span class="text-sm font-semibold">${member.username
                                    .charAt(0)
                                    .toUpperCase()}</span>`
                            }
                        </div>
                        <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-dark-900 rounded-full"></div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <div class="text-sm font-semibold truncate">${
                              member.username
                            }</div>
                            ${
                              isCurrentUser
                                ? '<span class="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full">You</span>'
                                : ""
                            }
                        </div>
                        <div class="text-xs text-gray-500 truncate">${ip}</div>
                    </div>
                </div>
            `;
      modalMembersList.insertAdjacentHTML("beforeend", memberHTML);
    });
  },

  async initWithProfile(profile) {
    console.log("Initializing chat with profile:", profile);
    this.currentProfile = profile;
    this.updateCurrentUserUI();

    // Connect to socket after profile is set
    if (window.SocketManager && !window.SocketManager.isConnected) {
      console.log("Connecting to WebSocket...");
      window.SocketManager.init();

      // Wait for connection
      await this.waitForConnection();
    }

    // Request chat history after connection
    if (window.SocketManager && window.SocketManager.isConnected) {
      console.log("Requesting chat history...");
      window.SocketManager.requestChatHistory();
    }

    console.log("✅ Chat initialization complete");
  },

  async waitForConnection() {
    // Wait for socket to connect (max 5 seconds)
    let attempts = 0;
    while (!window.SocketManager.isConnected && attempts < 50) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.SocketManager.isConnected) {
      console.warn("⚠️ Socket connection timeout");
    } else {
      console.log("✅ Socket connected");
    }
  },

  clearMessagesOnly() {
    // Clear only messages, preserve background layers (pattern + overlays)
    const messagesContainer = document.getElementById("messagesContainer");
    const messagesList = messagesContainer.querySelector(".max-w-5xl");

    if (messagesList) {
      messagesList.remove();
    }
  },

  ensureBackgroundLayers() {
    // Ensure background pattern exists
    const messagesContainer = document.getElementById("messagesContainer");

    // Check if pattern layer exists
    let patternLayer = messagesContainer.querySelector(".pattern-layer");
    if (!patternLayer) {
      patternLayer = document.createElement("div");
      patternLayer.className =
        "pattern-layer fixed inset-0 pointer-events-none";
      // Use SVG as mask, gradient as fill
      patternLayer.style.webkitMaskImage = "url('assets/pattern.svg')";
      patternLayer.style.maskImage = "url('assets/pattern.svg')";
      patternLayer.style.webkitMaskSize = "contain";
      patternLayer.style.maskSize = "contain";
      patternLayer.style.webkitMaskRepeat = "repeat";
      patternLayer.style.maskRepeat = "repeat";
      patternLayer.style.background =
        "linear-gradient(132deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)";
      patternLayer.style.opacity = "0.15";
      messagesContainer.insertBefore(
        patternLayer,
        messagesContainer.firstChild
      );
    }
  },

  setupEventListeners() {
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearChatBtn = document.getElementById("clearChatBtn");
    const emojiBtn = document.getElementById("emojiBtn");

    // Message input
    messageInput.addEventListener("input", (e) => {
      this.handleInputChange(e);
    });

    messageInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Send button
    sendBtn.addEventListener("click", () => {
      this.sendMessage();
    });

    // Clear chat button
    clearChatBtn.addEventListener("click", () => {
      this.clearChat();
    });

    // Emoji button (placeholder)
    emojiBtn.addEventListener("click", () => {
      this.showToast("Emoji picker coming soon!", "info");
    });

    // Auto-resize textarea
    messageInput.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });

    // Ctrl+P for CRC Debug Console
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        this.toggleCRCConsole();
      }
    });
  },

  handleInputChange(e) {
    const input = e.target;
    const charCount = document.getElementById("charCount");
    const sendBtn = document.getElementById("sendBtn");

    // Auto-resize textarea based on content (max 120px = ~5 lines)
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";

    // Update character count
    charCount.textContent = input.value.length;

    // Enable/disable send button
    if (input.value.trim().length > 0) {
      sendBtn.disabled = false;
    } else {
      sendBtn.disabled = true;
    }

    // Send typing indicator
    if (input.value.length > 0) {
      this.sendTypingIndicator(true);
    } else {
      this.sendTypingIndicator(false);
    }
  },

  sendTypingIndicator(isTyping) {
    if (isTyping) {
      SocketManager.sendTyping(true);

      // Clear previous timeout
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }

      // Stop typing after 3 seconds of inactivity
      this.typingTimeout = setTimeout(() => {
        SocketManager.sendTyping(false);
      }, 3000);
    } else {
      SocketManager.sendTyping(false);
      if (this.typingTimeout) {
        clearTimeout(this.typingTimeout);
      }
    }
  },

  sendMessage() {
    const messageInput = document.getElementById("messageInput");
    const message = messageInput.value.trim();

    if (!message) return;

    if (!this.currentProfile) {
      this.showToast("Profile not set", "error");
      return;
    }

    // Send via SocketManager
    const sent = SocketManager.sendMessage(message, this.currentProfile);

    if (sent) {
      // Clear input
      messageInput.value = "";
      messageInput.style.height = "auto";
      document.getElementById("charCount").textContent = "0";
      document.getElementById("sendBtn").disabled = true;

      // Stop typing indicator
      this.sendTypingIndicator(false);
    }
  },

  clearChat() {
    // Show custom confirmation modal
    this.showConfirmModal(
      "Clear Chat History?",
      "This will permanently delete all messages in this chat. This action cannot be undone.",
      "Clear Chat",
      () => {
        // Confirmed - clear the chat
        const messagesContainer = document.getElementById("messagesContainer");

        // Clear only messages, preserve background
        this.clearMessagesOnly();
        this.ensureBackgroundLayers();

        // Add welcome message
        const welcomeDiv = document.createElement("div");
        welcomeDiv.className = "max-w-5xl mx-auto space-y-4 relative z-10";
        welcomeDiv.innerHTML = `
                    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div class="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold mb-2">Chat Cleared!</h3>
                        <p class="text-gray-400">Start a new conversation</p>
                    </div>
                `;
        messagesContainer.appendChild(welcomeDiv);

        this.showToast("Chat cleared successfully", "success");
      }
    );
  },

  showConfirmModal(title, message, confirmText, onConfirm) {
    const modal = document.getElementById("confirmModal");
    const modalContent = document.getElementById("confirmModalContent");
    const modalTitle = document.getElementById("confirmModalTitle");
    const modalMessage = document.getElementById("confirmModalMessage");
    const confirmBtn = document.getElementById("confirmModalBtn");

    // Set content
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmBtn.textContent = confirmText;

    // Set confirm action
    confirmBtn.onclick = () => {
      this.hideConfirmModal();
      onConfirm();
    };

    // Show modal with animation
    modal.classList.remove("hidden");
    setTimeout(() => {
      modalContent.classList.remove("scale-95", "opacity-0");
      modalContent.classList.add("scale-100", "opacity-100");
    }, 10);
  },

  hideConfirmModal() {
    const modal = document.getElementById("confirmModal");
    const modalContent = document.getElementById("confirmModalContent");

    // Hide with animation
    modalContent.classList.remove("scale-100", "opacity-100");
    modalContent.classList.add("scale-95", "opacity-0");

    setTimeout(() => {
      modal.classList.add("hidden");
    }, 200);
  },

  // Socket event handlers
  onNewMessage(data, isValid) {
    const messagesContainer = document.getElementById("messagesContainer");

    // Remove welcome message if exists
    const welcomeMsg = messagesContainer.querySelector(".min-h-\\[60vh\\]");
    if (welcomeMsg && welcomeMsg.parentElement) {
      welcomeMsg.parentElement.remove();
    }

    // Check if max-w container exists, if not create it
    let messagesList = messagesContainer.querySelector(".max-w-5xl");
    if (!messagesList) {
      messagesList = document.createElement("div");
      messagesList.className = "max-w-5xl mx-auto space-y-4 relative z-10";
      messagesContainer.appendChild(messagesList);
    }

    const isOwnMessage = data.ip_client === this.getClientIP();

    const messageHTML = this.createMessageElement(data, isOwnMessage, isValid);
    messagesList.insertAdjacentHTML("beforeend", messageHTML);

    // Auto scroll to bottom (smooth)
    this.scrollToBottom();
  },

  scrollToBottom() {
    const messagesContainer = document.getElementById("messagesContainer");
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  },

  onUserJoined(data) {
    this.members.set(data.ip_client, data);
    this.updateMembersList();

    // Show notification
    const messagesContainer = document.getElementById("messagesContainer");

    // Ensure background layers exist
    this.ensureBackgroundLayers();

    // Check if max-w container exists, if not create it
    let messagesList = messagesContainer.querySelector(".max-w-5xl");
    if (!messagesList) {
      // Remove welcome if exists (but preserve background layers)
      this.clearMessagesOnly();
      this.ensureBackgroundLayers();

      messagesList = document.createElement("div");
      messagesList.className = "max-w-5xl mx-auto space-y-4 relative z-10";
      messagesContainer.appendChild(messagesList);
    }

    const notificationHTML = `
            <div class="flex justify-center my-4">
                <div class="px-4 py-2 bg-green-500/10 text-green-400 rounded-full text-sm">
                    <span class="font-semibold">${data.username}</span> joined the chat
                </div>
            </div>
        `;
    messagesList.insertAdjacentHTML("beforeend", notificationHTML);
    this.scrollToBottom();
  },

  onUserLeft(data) {
    this.members.delete(data.ip_client);
    this.updateMembersList();

    // Show notification
    const messagesContainer = document.getElementById("messagesContainer");
    let messagesList = messagesContainer.querySelector(".max-w-5xl");

    if (messagesList) {
      const notificationHTML = `
                <div class="flex justify-center my-4">
                    <div class="px-4 py-2 bg-red-500/10 text-red-400 rounded-full text-sm">
                        <span class="font-semibold">${data.username}</span> left the chat
                    </div>
                </div>
            `;
      messagesList.insertAdjacentHTML("beforeend", notificationHTML);
      this.scrollToBottom();
    }
  },

  onTyping(data) {
    this.typingUsers.add(data.username);
    this.updateTypingIndicator();
  },

  onStopTyping(data) {
    this.typingUsers.delete(data.username);
    this.updateTypingIndicator();
  },

  onMembersUpdate(data) {
    // Update members list
    this.members.clear();
    data.members.forEach((member) => {
      this.members.set(member.ip_client, member);
    });
    this.updateMembersList();
  },

  onChatHistory(messages) {
    const messagesContainer = document.getElementById("messagesContainer");

    // Clear only messages, preserve background layers
    this.clearMessagesOnly();
    this.ensureBackgroundLayers();

    if (messages.length === 0) {
      const welcomeDiv = document.createElement("div");
      welcomeDiv.className = "max-w-5xl mx-auto space-y-4 relative z-10";
      welcomeDiv.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div class="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold mb-2">Welcome to Local Chat!</h3>
                    <p class="text-gray-400">Mulai percakapan dengan mengirim pesan pertama</p>
                </div>
            `;
      messagesContainer.appendChild(welcomeDiv);
      return;
    }

    // Create max-w container
    const messagesList = document.createElement("div");
    messagesList.className = "max-w-5xl mx-auto space-y-4 relative z-10";
    messagesContainer.appendChild(messagesList);

    // Display messages
    messages.forEach((msg) => {
      const isValid = crc32.verify(msg.message, msg.crc);
      const isOwnMessage = msg.ip_client === this.getClientIP();
      const messageHTML = this.createMessageElement(msg, isOwnMessage, isValid);
      messagesList.insertAdjacentHTML("beforeend", messageHTML);
    });

    // Scroll to bottom
    this.scrollToBottom();
  },

  createMessageElement(data, isOwn, isValid) {
    const time = new Date(data.timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const alignment = isOwn ? "justify-end" : "justify-start";
    const bubbleStyle = isOwn
      ? "bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/30"
      : "bg-white/10 backdrop-blur-md border border-white/20 shadow-lg";
    const errorBadge = !isValid
      ? `<span class="text-xs text-red-400 ml-2">[CRC Error]</span>`
      : "";

    return `
            <div class="flex ${alignment} gap-3 animate-fade-in">
                ${
                  !isOwn
                    ? `
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden ring-2 ring-indigo-500/30">
                            ${
                              data.photo
                                ? `<img src="${data.photo}" alt="${data.username}" class="w-full h-full object-cover object-center">`
                                : `<span class="text-sm font-semibold">${data.username
                                    .charAt(0)
                                    .toUpperCase()}</span>`
                            }
                        </div>
                    </div>
                `
                    : ""
                }
                <div class="max-w-md">
                    ${
                      !isOwn
                        ? `<div class="text-xs font-medium text-indigo-300 mb-1 ml-1">${data.username}</div>`
                        : ""
                    }
                    <div class="${bubbleStyle} px-4 py-2.5 rounded-2xl ${
      isOwn ? "rounded-tr-sm" : "rounded-tl-sm"
    } transition-all hover:scale-[1.02] relative">
                        <p class="text-sm leading-relaxed break-words pr-14">${this.escapeHTML(
                          data.message
                        )}</p>
                        <!-- Timestamp inside bubble -->
                        <div class="absolute bottom-2 right-3 text-[10px] ${
                          isOwn ? "text-white/70" : "text-gray-400"
                        } flex items-center gap-1 select-none">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${time}${errorBadge}
                        </div>
                    </div>
                </div>
                ${
                  isOwn
                    ? `
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden ring-2 ring-indigo-500/30">
                            ${
                              data.photo
                                ? `<img src="${data.photo}" alt="You" class="w-full h-full object-cover object-center">`
                                : `<span class="text-sm font-semibold">${data.username
                                    .charAt(0)
                                    .toUpperCase()}</span>`
                            }
                        </div>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  },

  updateMembersList() {
    const membersBadge = document.getElementById("membersBadge");

    // Check if element exists
    if (!membersBadge) {
      console.log("⚠️ Members badge not found, skipping update");
      return;
    }

    // Update badge count
    membersBadge.textContent = this.members.size;

    // Update badge visibility and animation
    if (this.members.size > 0) {
      membersBadge.classList.remove("scale-0");
      membersBadge.classList.add("scale-100");
    } else {
      membersBadge.classList.add("scale-0");
    }
  },

  updateTypingIndicator() {
    const typingIndicator = document.getElementById("typingIndicator");
    const typingUsers = document.getElementById("typingUsers");

    if (this.typingUsers.size === 0) {
      typingIndicator.classList.add("hidden");
      return;
    }

    const users = Array.from(this.typingUsers);
    let text = "";

    if (users.length === 1) {
      text = `${users[0]} is typing...`;
    } else if (users.length === 2) {
      text = `${users[0]} and ${users[1]} are typing...`;
    } else {
      text = `${users.length} people are typing...`;
    }

    typingUsers.textContent = text;
    typingIndicator.classList.remove("hidden");
  },

  updateCurrentUserUI() {
    if (!this.currentProfile) return;

    // Update modal current user (if modal exists)
    const modalCurrentUserName = document.getElementById(
      "modalCurrentUserName"
    );
    const modalCurrentUserAvatar = document.getElementById(
      "modalCurrentUserAvatar"
    );

    if (modalCurrentUserName) {
      modalCurrentUserName.textContent = this.currentProfile.username;
    }

    if (modalCurrentUserAvatar) {
      if (this.currentProfile.photo) {
        const img = modalCurrentUserAvatar.querySelector("img");
        if (img) {
          img.src = this.currentProfile.photo;
        }
      } else {
        modalCurrentUserAvatar.innerHTML = `<span class="text-lg font-semibold">${this.currentProfile.username
          .charAt(0)
          .toUpperCase()}</span>`;
      }
    }

    console.log("✅ Current user UI updated:", this.currentProfile.username);
  },

  getClientIP() {
    // Get from current profile
    return this.currentProfile?.ip_client || "unknown";
  },

  toggleCRCConsole() {
    const crcConsole = document.getElementById("crcDebugConsole");
    console.log("🔧 Toggle CRC Console:", {
      consoleExists: !!crcConsole,
      isHidden: crcConsole?.classList.contains("hidden"),
    });

    if (!crcConsole) {
      console.error("❌ CRC Debug Console element not found!");
      return;
    }

    if (crcConsole.classList.contains("hidden")) {
      crcConsole.classList.remove("hidden");
      console.log("✅ CRC Console opened");
    } else {
      crcConsole.classList.add("hidden");
      console.log("✅ CRC Console closed");
    }
  },

  logCRCProcess(message, crc) {
    console.log("📊 logCRCProcess called:", { message, crc });

    const consoleContent = document.getElementById("crcConsoleContent");
    if (!consoleContent) {
      console.error("❌ crcConsoleContent element not found!");
      return;
    }

    console.log("✅ Found crcConsoleContent, logging process...");

    const timestamp = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });

    // Convert binary to hex and decimal for reference
    const crcInt = parseInt(crc, 2);
    const hex = crcInt.toString(16).toUpperCase().padStart(8, "0");

    // Format binary dengan spacing setiap 8 bit
    const binaryFormatted = crc.match(/.{1,8}/g).join(" ");

    // Convert message to binary for visualization
    let messageBinary = "";
    let messageBinaryFormatted = "";
    for (let i = 0; i < message.length; i++) {
      const charBinary = message.charCodeAt(i).toString(2).padStart(8, "0");
      messageBinary += charBinary;
      messageBinaryFormatted += `${message[i]}: ${charBinary}\n`;
    }

    // Append zeros (32 bits)
    const dataWithZeros = messageBinary + "0".repeat(32);
    const totalBits = messageBinary.length + 32;

    // Generator info
    const generatorHex = "0x04C11DB7";
    const generatorBinary = "100000100110000010001110110110111";
    const generatorDecimal = parseInt(generatorBinary, 2);

    const logHTML = `
            <div class="mt-3 border border-indigo-700/30 rounded-lg p-4 bg-gradient-to-br from-dark-800/50 to-indigo-900/20">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-indigo-700/30">
                    <div class="text-cyan-400 font-semibold flex items-center gap-2">
                        <span class="text-lg">⚡</span> NEW MESSAGE SENT
                    </div>
                    <div class="text-gray-600 text-[10px] font-mono">[${timestamp}]</div>
                </div>
                
                <!-- Step 1: Data Original -->
                <div class="mb-4 p-3 bg-dark-900/40 rounded-lg border border-gray-800">
                    <div class="text-yellow-400 text-xs font-bold mb-2">📝 STEP 1: DATA ASLI</div>
                    <div class="pl-3 space-y-2">
                        <div class="text-green-300 font-semibold">"${this.escapeHTML(
                          message
                        )}"</div>
                        <div class="text-gray-500 text-[10px]">
                            Length: ${message.length} characters = ${
      message.length * 8
    } bits
                        </div>
                        <div class="mt-2">
                            <div class="text-gray-500 text-[10px] mb-1">Konversi ke Binary:</div>
                            <div class="text-gray-400 text-[10px] font-mono whitespace-pre-wrap pl-2 bg-black/30 p-2 rounded">${messageBinaryFormatted.trim()}</div>
                        </div>
                        <div class="mt-2">
                            <div class="text-gray-500 text-[10px]">Binary lengkap (${
                              message.length * 8
                            } bits):</div>
                            <div class="text-purple-300 text-[10px] font-mono break-all leading-relaxed bg-black/30 p-2 rounded mt-1">
                                ${messageBinary.match(/.{1,8}/g).join(" ")}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Step 2: Generator (Pembagi) -->
                <div class="mb-4 p-3 bg-dark-900/40 rounded-lg border border-gray-800">
                    <div class="text-yellow-400 text-xs font-bold mb-2">🔑 STEP 2: GENERATOR (Pembagi G)</div>
                    <div class="pl-3 space-y-2">
                        <div class="text-gray-400 text-[10px]">
                            CRC-32 menggunakan <span class="text-cyan-400">angka pembagi standar</span>:
                        </div>
                        <div class="space-y-1 pl-2">
                            <div class="text-[10px]">
                                <span class="text-gray-500">Hexadecimal:</span>
                                <span class="text-cyan-300 font-mono ml-2">${generatorHex}</span>
                            </div>
                            <div class="text-[10px]">
                                <span class="text-gray-500">Decimal:</span>
                                <span class="text-green-300 font-mono ml-2">${generatorDecimal.toLocaleString()}</span>
                            </div>
                            <div class="text-[10px]">
                                <span class="text-gray-500">Binary (33 bits):</span>
                                <div class="text-yellow-300 font-mono break-all leading-relaxed bg-black/30 p-2 rounded mt-1">
                                    ${generatorBinary
                                      .match(/.{1,8}/g)
                                      .join(" ")}
                                </div>
                            </div>
                        </div>
                        <div class="text-gray-600 text-[10px] italic">
                            ℹ️ Kenapa 33 bits? Karena CRC-32 butuh sisa 32 bits, pembagi harus +1 bit
                        </div>
                    </div>
                </div>

                <!-- Step 3: Append Zeros -->
                <div class="mb-4 p-3 bg-dark-900/40 rounded-lg border border-gray-800">
                    <div class="text-yellow-400 text-xs font-bold mb-2">➕ STEP 3: TAMBAHKAN NOL</div>
                    <div class="pl-3 space-y-2">
                        <div class="text-gray-400 text-[10px]">
                            Tambahkan <span class="text-orange-400">32 bit nol</span> di belakang data:
                        </div>
                        <div class="space-y-1 pl-2 text-[10px]">
                            <div>
                                <span class="text-gray-500">Data asli:</span>
                                <span class="text-purple-300 font-mono ml-2">${
                                  message.length * 8
                                } bits</span>
                            </div>
                            <div>
                                <span class="text-gray-500">Tambah nol:</span>
                                <span class="text-orange-300 font-mono ml-2">32 bits (00000000 00000000 00000000 00000000)</span>
                            </div>
                            <div class="pt-1 border-t border-gray-700 mt-1">
                                <span class="text-gray-500">Total:</span>
                                <span class="text-cyan-300 font-mono ml-2 font-bold">${totalBits} bits</span>
                            </div>
                        </div>
                        <div class="text-gray-400 text-[10px] bg-black/30 p-2 rounded font-mono break-all leading-relaxed mt-2">
                            ${dataWithZeros.match(/.{1,8}/g).join(" ")}
                        </div>
                        <div class="text-gray-600 text-[10px] italic">
                            💡 Kenapa tambah nol? Supaya hasil sisa pembagian tepat 32 bits!
                        </div>
                    </div>
                </div>

                <!-- Step 4: XOR Division -->
                <div class="mb-4 p-3 bg-dark-900/40 rounded-lg border border-gray-800">
                    <div class="text-yellow-400 text-xs font-bold mb-2">➗ STEP 4: PEMBAGIAN XOR</div>
                    <div class="pl-3 space-y-2">
                        <div class="text-gray-400 text-[10px]">
                            Bagi data (${totalBits} bits) dengan G (33 bits) menggunakan <span class="text-red-400">operasi XOR</span>:
                        </div>
                        <div class="bg-black/40 p-2 rounded space-y-1 text-[10px]">
                            <div class="text-cyan-300 font-bold">Aturan XOR (⊕):</div>
                            <div class="pl-2 font-mono space-y-0.5">
                                <div><span class="text-yellow-300">1 ⊕ 1 = 0</span> (sama → 0)</div>
                                <div><span class="text-yellow-300">1 ⊕ 0 = 1</span> (beda → 1)</div>
                                <div><span class="text-yellow-300">0 ⊕ 1 = 1</span> (beda → 1)</div>
                                <div><span class="text-yellow-300">0 ⊕ 0 = 0</span> (sama → 0)</div>
                            </div>
                        </div>
                        <div class="text-gray-400 text-[10px] space-y-1 mt-2">
                            <div class="font-semibold text-orange-300">Proses:</div>
                            <div class="pl-2 space-y-0.5">
                                <div>1. Align G dengan bit pertama yang '1'</div>
                                <div>2. Lakukan XOR bit-by-bit</div>
                                <div>3. Geser hasil, cari '1' berikutnya</div>
                                <div>4. Ulangi sampai semua ${totalBits} bits diproses</div>
                                <div>5. Sisa terakhir = <span class="text-purple-400">32 bits</span></div>
                            </div>
                        </div>
                        <div class="text-gray-600 text-[10px] italic bg-gray-900/30 p-2 rounded mt-2">
                            ⚙️ Proses ini dilakukan oleh algoritma CRC-32 table lookup (sangat cepat!)
                        </div>
                    </div>
                </div>

                <!-- Step 5: Final XOR -->
                <div class="mb-4 p-3 bg-dark-900/40 rounded-lg border border-gray-800">
                    <div class="text-yellow-400 text-xs font-bold mb-2">🔄 STEP 5: FINAL XOR</div>
                    <div class="pl-3 space-y-2">
                        <div class="text-gray-400 text-[10px]">
                            Sisa pembagian di-XOR dengan <span class="text-cyan-400">0xFFFFFFFF</span>:
                        </div>
                        <div class="bg-black/30 p-2 rounded font-mono text-[10px] space-y-1">
                            <div class="text-gray-500">Remainder (sisa) ⊕ 0xFFFFFFFF</div>
                            <div class="text-purple-300">= CRC32 Checksum Final</div>
                        </div>
                        <div class="text-gray-600 text-[10px] italic">
                            💡 Ini adalah standar CRC-32, untuk meningkatkan deteksi error
                        </div>
                    </div>
                </div>

                <!-- Result -->
                <div class="p-3 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-700/50">
                    <div class="text-purple-300 text-xs font-bold mb-3 flex items-center gap-2">
                        <span class="text-lg">✅</span> HASIL AKHIR: CRC32 CHECKSUM
                    </div>
                    
                    <div class="space-y-3 pl-3">
                        <!-- Binary -->
                        <div>
                            <div class="text-gray-500 text-[10px] mb-1">Binary (32-bit):</div>
                            <div class="text-purple-200 font-mono text-xs bg-black/40 p-2 rounded break-all leading-relaxed">
                                ${binaryFormatted}
                            </div>
                        </div>
                        
                        <!-- Hexadecimal -->
                        <div>
                            <div class="text-gray-500 text-[10px] mb-1">Hexadecimal:</div>
                            <div class="text-cyan-300 font-mono text-sm bg-black/40 p-2 rounded">
                                0x${hex}
                            </div>
                        </div>
                        
                        <!-- Decimal -->
                        <div>
                            <div class="text-gray-500 text-[10px] mb-1">Decimal:</div>
                            <div class="text-green-300 font-mono text-sm bg-black/40 p-2 rounded">
                                ${crcInt.toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Transmission & Verification -->
                <div class="mt-4 p-3 bg-dark-900/40 rounded-lg border border-gray-800">
                    <div class="text-orange-400 text-xs font-bold mb-2">📡 TRANSMISSION FRAME</div>
                    <div class="pl-3 space-y-2">
                        <div class="text-gray-400 text-[10px]">
                            Yang dikirim ke penerima:
                        </div>
                        <div class="bg-black/30 p-2 rounded font-mono text-[10px]">
                            <div class="text-cyan-300">[ Message: ${
                              message.length * 8
                            } bits ] + [ CRC32: 32 bits ]</div>
                            <div class="text-gray-500 mt-1">= Total ${totalBits} bits</div>
                        </div>
                    </div>
                    
                    <div class="mt-3 pt-3 border-t border-gray-800">
                        <div class="text-green-400 text-xs font-bold mb-2">🔍 VERIFIKASI (Penerima)</div>
                        <div class="pl-3 text-[10px] space-y-1 text-gray-400">
                            <div>1. Penerima dapat: <span class="text-cyan-300">Data + CRC (${totalBits} bits)</span></div>
                            <div>2. Bagi dengan G (sama seperti pengirim)</div>
                            <div>3. Jika sisa = <span class="text-green-400">00000000 00000000 00000000 00000000</span> → ✅ <span class="text-green-400">Tidak ada error</span></div>
                            <div>4. Jika sisa ≠ 0 → ❌ <span class="text-red-400">Error terdeteksi!</span></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    consoleContent.insertAdjacentHTML("beforeend", logHTML);
    consoleContent.scrollTop = consoleContent.scrollHeight;
    console.log("✅ CRC process logged successfully");
  },

  clearCRCConsole() {
    const consoleContent = document.getElementById("crcConsoleContent");
    if (!consoleContent) return;

    consoleContent.innerHTML = `
            <div class="text-green-400">
                <span class="text-gray-500">$</span> Monitor cleared
            </div>
            <div class="text-gray-500 mt-1">Waiting for new messages...</div>
            <div class="h-px bg-gray-800 my-3"></div>
        `;
  },

  testCRCLog() {
    const testMessage = "Hallo World";
    const testCRC = crc32.calculate(testMessage);
    console.log("🧪 Test CRC Log:", { testMessage, testCRC });
    this.logCRCProcess(testMessage, testCRC);
  },

  escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },

  showToast(message, type = "info") {
    if (window.ProfileManager) {
      window.ProfileManager.showToast(message, type);
    }
  },
};

// Make ChatApp globally available
window.ChatApp = ChatApp;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  ChatApp.init();
});
