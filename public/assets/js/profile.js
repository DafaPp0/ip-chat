// Profile Management
const ProfileManager = {
  photoFile: null,
  photoPreviewURL: null,

  init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    const photoUpload = document.getElementById("photoUpload");
    const profileForm = document.getElementById("profileForm");
    const usernameInput = document.getElementById("username");

    // Photo upload handler
    photoUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.handlePhotoUpload(file);
      }
    });

    // Form submit handler
    profileForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = usernameInput.value.trim();

      if (!username) {
        this.showToast("Please enter a username", "error");
        return;
      }

      await this.submitProfile(username);
    });
  },

  handlePhotoUpload(file) {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      this.showToast("Please upload an image file", "error");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.showToast("Image size should be less than 5MB", "error");
      return;
    }

    this.photoFile = file;

    // Preview photo
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreviewURL = e.target.result;
      const preview = document.getElementById("avatarPreview");
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-full h-full object-cover rounded-full">`;
    };
    reader.readAsDataURL(file);
  },

  async submitProfile(username) {
    try {
      const formData = new FormData();
      formData.append("username", username);

      if (this.photoFile) {
        formData.append("photo", this.photoFile);
      }

      console.log("Submitting profile for username:", username);

      // Send to server
      const response = await fetch("/api/profile/setup", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to setup profile");
      }

      const data = await response.json();

      console.log("Profile setup successful:", data.profile);

      // Save profile to localStorage
      localStorage.setItem("userProfile", JSON.stringify(data.profile));

      // Hide modal and show chat
      document.getElementById("profileModal").classList.add("hidden");
      document.getElementById("chatContainer").classList.remove("hidden");

      // Initialize chat with profile
      if (window.ChatApp) {
        window.ChatApp.initWithProfile(data.profile);
      }

      this.showToast("Profile setup successful!", "success");
    } catch (error) {
      console.error("Error setting up profile:", error);
      this.showToast(
        error.message || "Failed to setup profile. Please try again.",
        "error"
      );
    }
  },

  async checkExistingProfile() {
    try {
      console.log("Checking existing profile...");
      const response = await fetch("/api/profile/check");
      const data = await response.json();

      console.log("Profile check result:", data);

      if (data.exists && data.profile) {
        // Profile exists, skip modal
        localStorage.setItem("userProfile", JSON.stringify(data.profile));
        document.getElementById("profileModal").classList.add("hidden");
        document.getElementById("chatContainer").classList.remove("hidden");

        console.log("Profile found, initializing chat...");

        if (window.ChatApp) {
          window.ChatApp.initWithProfile(data.profile);
        }
      } else {
        // Show profile setup modal
        console.log("No profile found, showing setup modal");
        document.getElementById("profileModal").classList.remove("hidden");
        document.getElementById("chatContainer").classList.add("hidden");
      }
    } catch (error) {
      console.error("Error checking profile:", error);
      // Show modal on error
      document.getElementById("profileModal").classList.remove("hidden");
      document.getElementById("chatContainer").classList.add("hidden");
    }
  },

  showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    const toastMessage = toast.querySelector(".toast-message");
    const toastIcon = toast.querySelector(".toast-icon");

    // Set message
    toastMessage.textContent = message;

    // Set icon based on type
    const icons = {
      success: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
      error: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
      info: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    };

    toastIcon.innerHTML = icons[type] || icons.info;

    // Show toast
    toast.classList.remove("hidden");

    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.add("hidden");
    }, 3000);
  },
};

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  ProfileManager.init();
  ProfileManager.checkExistingProfile();
});
