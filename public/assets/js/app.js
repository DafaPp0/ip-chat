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

    // Update count
    modalOnlineCount.textContent = this.members.size;

    // Update current user
    if (this.currentProfile) {
      modalCurrentUserName.textContent = this.currentProfile.username;
      if (this.currentProfile.photo) {
        modalCurrentUserAvatar.querySelector("img").src =
          this.currentProfile.photo;
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
                                ? `<img src="${member.photo}" alt="${member.username}" class="w-full h-full object-cover">`
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

  initWithProfile(profile) {
    console.log("Initializing chat with profile:", profile);
    this.currentProfile = profile;
    this.updateCurrentUserUI();

    // Connect to socket after profile is set
    if (window.SocketManager && !window.SocketManager.isConnected) {
      console.log("Connecting to WebSocket...");
      window.SocketManager.init();
    }

    // Request chat history after a short delay
    setTimeout(() => {
      if (window.SocketManager) {
        window.SocketManager.requestChatHistory();
      }
    }, 1000);
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
  },

  handleInputChange(e) {
    const input = e.target;
    const charCount = document.getElementById("charCount");
    const sendBtn = document.getElementById("sendBtn");

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
    const messagesContainer = document.getElementById("messagesContainer");

    if (
      confirm(
        "Are you sure you want to clear all messages? This cannot be undone."
      )
    ) {
      // Clear UI - restore welcome message with Telegram-style pattern
      messagesContainer.innerHTML = `
                <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=%22200%22 height=%22200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern id=%22telegram-pattern%22 x=%220%22 y=%220%22 width=%22200%22 height=%22200%22 patternUnits=%22userSpaceOnUse%22%3E%3C!-- Message Icon --%3E%3Cpath d=%22M30,40 L50,40 L50,60 L40,70 L40,60 L30,60 Z%22 fill=%22%239CA3AF%22 opacity=%220.4%22/%3E%3C!-- Heart Icon --%3E%3Cpath d=%22M150,30 Q160,20 170,30 Q175,35 170,45 L160,55 L150,45 Q145,35 150,30 Z%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3C!-- Star Icon --%3E%3Cpath d=%22M80,140 L85,155 L100,157 L90,167 L92,182 L80,175 L68,182 L70,167 L60,157 L75,155 Z%22 fill=%22%239CA3AF%22 opacity=%220.35%22/%3E%3C!-- Circle --%3E%3Ccircle cx=%22170%22 cy=%22140%22 r=%228%22 fill=%22%239CA3AF%22 opacity=%220.25%22/%3E%3C!-- Camera Icon --%3E%3Crect x=%2230%22 y=%22160%22 width=%2230%22 height=%2220%22 rx=%223%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3Ccircle cx=%2245%22 cy=%22170%22 r=%226%22 fill=%22%239CA3AF%22 opacity=%220.4%22/%3E%3C!-- Music Note --%3E%3Cpath d=%22M140,80 L145,80 L145,100 Q145,105 140,105 Q135,105 135,100 L135,85 Z%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3Ccircle cx=%22140%22 cy=%22105%22 r=%224%22 fill=%22%239CA3AF%22 opacity=%220.35%22/%3E%3C!-- Phone Icon --%3E%3Crect x=%2275%22 y=%2230%22 width=%2215%22 height=%2225%22 rx=%223%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3C!-- Paperclip --%3E%3Cpath d=%22M110,150 Q105,145 110,140 L120,130 Q125,125 130,130 Q135,135 130,140 L115,155%22 stroke=%22%239CA3AF%22 fill=%22none%22 stroke-width=%222%22 opacity=%220.3%22/%3E%3C!-- Small dots --%3E%3Ccircle cx=%22160%22 cy=%2280%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3Ccircle cx=%2250%22 cy=%22120%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3Ccircle cx=%22100%22 cy=%2270%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=%22200%22 height=%22200%22 fill=%22url(%23telegram-pattern)%22/%3E%3C/svg%3E'); background-size: 200px 200px;"></div>
                <div class="max-w-5xl mx-auto space-y-4 relative z-10">
                    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <div class="w-20 h-20 gradient-primary rounded-full flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold mb-2">Chat Cleared!</h3>
                        <p class="text-gray-400">Start a new conversation</p>
                    </div>
                </div>
            `;

      this.showToast("Chat cleared successfully", "success");
    }
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

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  onUserJoined(data) {
    this.members.set(data.ip_client, data);
    this.updateMembersList();

    // Show notification
    const messagesContainer = document.getElementById("messagesContainer");

    // Check if max-w container exists, if not create it
    let messagesList = messagesContainer.querySelector(".max-w-5xl");
    if (!messagesList) {
      // Remove welcome if exists
      messagesContainer.innerHTML = `
                <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=%22200%22 height=%22200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern id=%22telegram-pattern%22 x=%220%22 y=%220%22 width=%22200%22 height=%22200%22 patternUnits=%22userSpaceOnUse%22%3E%3C!-- Message Icon --%3E%3Cpath d=%22M30,40 L50,40 L50,60 L40,70 L40,60 L30,60 Z%22 fill=%22%239CA3AF%22 opacity=%220.4%22/%3E%3C!-- Heart Icon --%3E%3Cpath d=%22M150,30 Q160,20 170,30 Q175,35 170,45 L160,55 L150,45 Q145,35 150,30 Z%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3C!-- Star Icon --%3E%3Cpath d=%22M80,140 L85,155 L100,157 L90,167 L92,182 L80,175 L68,182 L70,167 L60,157 L75,155 Z%22 fill=%22%239CA3AF%22 opacity=%220.35%22/%3E%3C!-- Circle --%3E%3Ccircle cx=%22170%22 cy=%22140%22 r=%228%22 fill=%22%239CA3AF%22 opacity=%220.25%22/%3E%3C!-- Camera Icon --%3E%3Crect x=%2230%22 y=%22160%22 width=%2230%22 height=%2220%22 rx=%223%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3Ccircle cx=%2245%22 cy=%22170%22 r=%226%22 fill=%22%239CA3AF%22 opacity=%220.4%22/%3E%3C!-- Music Note --%3E%3Cpath d=%22M140,80 L145,80 L145,100 Q145,105 140,105 Q135,105 135,100 L135,85 Z%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3Ccircle cx=%22140%22 cy=%22105%22 r=%224%22 fill=%22%239CA3AF%22 opacity=%220.35%22/%3E%3C!-- Phone Icon --%3E%3Crect x=%2275%22 y=%2230%22 width=%2215%22 height=%2225%22 rx=%223%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3C!-- Paperclip --%3E%3Cpath d=%22M110,150 Q105,145 110,140 L120,130 Q125,125 130,130 Q135,135 130,140 L115,155%22 stroke=%22%239CA3AF%22 fill=%22none%22 stroke-width=%222%22 opacity=%220.3%22/%3E%3C!-- Small dots --%3E%3Ccircle cx=%22160%22 cy=%2280%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3Ccircle cx=%2250%22 cy=%22120%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3Ccircle cx=%22100%22 cy=%2270%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=%22200%22 height=%22200%22 fill=%22url(%23telegram-pattern)%22/%3E%3C/svg%3E'); background-size: 200px 200px;"></div>
            `;
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
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

    // Clear container but keep pattern
    messagesContainer.innerHTML = `
            <div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=%22200%22 height=%22200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cdefs%3E%3Cpattern id=%22telegram-pattern%22 x=%220%22 y=%220%22 width=%22200%22 height=%22200%22 patternUnits=%22userSpaceOnUse%22%3E%3C!-- Message Icon --%3E%3Cpath d=%22M30,40 L50,40 L50,60 L40,70 L40,60 L30,60 Z%22 fill=%22%239CA3AF%22 opacity=%220.4%22/%3E%3C!-- Heart Icon --%3E%3Cpath d=%22M150,30 Q160,20 170,30 Q175,35 170,45 L160,55 L150,45 Q145,35 150,30 Z%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3C!-- Star Icon --%3E%3Cpath d=%22M80,140 L85,155 L100,157 L90,167 L92,182 L80,175 L68,182 L70,167 L60,157 L75,155 Z%22 fill=%22%239CA3AF%22 opacity=%220.35%22/%3E%3C!-- Circle --%3E%3Ccircle cx=%22170%22 cy=%22140%22 r=%228%22 fill=%22%239CA3AF%22 opacity=%220.25%22/%3E%3C!-- Camera Icon --%3E%3Crect x=%2230%22 y=%22160%22 width=%2230%22 height=%2220%22 rx=%223%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3Ccircle cx=%2245%22 cy=%22170%22 r=%226%22 fill=%22%239CA3AF%22 opacity=%220.4%22/%3E%3C!-- Music Note --%3E%3Cpath d=%22M140,80 L145,80 L145,100 Q145,105 140,105 Q135,105 135,100 L135,85 Z%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3Ccircle cx=%22140%22 cy=%22105%22 r=%224%22 fill=%22%239CA3AF%22 opacity=%220.35%22/%3E%3C!-- Phone Icon --%3E%3Crect x=%2275%22 y=%2230%22 width=%2215%22 height=%2225%22 rx=%223%22 fill=%22%239CA3AF%22 opacity=%220.3%22/%3E%3C!-- Paperclip --%3E%3Cpath d=%22M110,150 Q105,145 110,140 L120,130 Q125,125 130,130 Q135,135 130,140 L115,155%22 stroke=%22%239CA3AF%22 fill=%22none%22 stroke-width=%222%22 opacity=%220.3%22/%3E%3C!-- Small dots --%3E%3Ccircle cx=%22160%22 cy=%2280%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3Ccircle cx=%2250%22 cy=%22120%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3Ccircle cx=%22100%22 cy=%2270%22 r=%223%22 fill=%22%239CA3AF%22 opacity=%220.2%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=%22200%22 height=%22200%22 fill=%22url(%23telegram-pattern)%22/%3E%3C/svg%3E'); background-size: 200px 200px;"></div>
        `;

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
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  createMessageElement(data, isOwn, isValid) {
    const time = new Date(data.timestamp).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const alignment = isOwn ? "justify-end" : "justify-start";
    const bgColor = isOwn ? "gradient-primary" : "bg-dark-800";
    const errorBadge = !isValid
      ? `<span class="text-xs text-red-400 ml-2">[CRC Error]</span>`
      : "";

    return `
            <div class="flex ${alignment} gap-3 animate-fade-in">
                ${
                  !isOwn
                    ? `
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
                            ${
                              data.photo
                                ? `<img src="${data.photo}" alt="${data.username}" class="w-full h-full object-cover">`
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
                        ? `<div class="text-xs text-gray-400 mb-1 ml-1">${data.username}</div>`
                        : ""
                    }
                    <div class="${bgColor} px-4 py-2.5 rounded-2xl ${
      isOwn ? "rounded-tr-sm" : "rounded-tl-sm"
    } shadow-lg">
                        <p class="text-sm leading-relaxed break-words">${this.escapeHTML(
                          data.message
                        )}</p>
                    </div>
                    <div class="text-xs text-gray-500 mt-1 ml-1">
                        ${time}${errorBadge}
                    </div>
                </div>
                ${
                  isOwn
                    ? `
                    <div class="flex-shrink-0">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden">
                            ${
                              data.photo
                                ? `<img src="${data.photo}" alt="You" class="w-full h-full object-cover">`
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

    const currentUserName = document.getElementById("currentUserName");
    const currentUserAvatar = document.getElementById("currentUserAvatar");

    if (!currentUserName || !currentUserAvatar) {
      console.warn("User UI elements not found. Skipping update.");
      return;
    }

    currentUserName.textContent = this.currentProfile.username;

    if (this.currentProfile.photo) {
      currentUserAvatar.innerHTML = `<img src="${this.currentProfile.photo}" class="w-10 h-10 rounded-full object-cover">`;
    } else {
      currentUserAvatar.innerHTML = `
        <span class="text-lg font-semibold">
          ${this.currentProfile.username.charAt(0).toUpperCase()}
        </span>`;
    }
  },

  getClientIP() {
    // Get from current profile
    return this.currentProfile?.ip_client || "unknown";
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
