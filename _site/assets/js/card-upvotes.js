import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.11/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/9.6.11/firebase-database.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCAA588yxf40QdEJghoEQqfh37AK828MKw",
  authDomain: "vc-comments.firebaseapp.com",
  databaseURL: "https://vc-comments-default-rtdb.firebaseio.com",
  projectId: "vc-comments",
  storageBucket: "vc-comments.appspot.com",
  messagingSenderId: "114746372203",
  appId: "1:114746372203:web:6b08497167b5a6c46dc12e"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Helpers
function hasUpvoted(vcId) {
  return document.cookie.includes(`upvote_${vcId}=1`);
}
function addUpvoteToCookie(vcId) {
  document.cookie = `upvote_${vcId}=1; path=/; max-age=31536000`;
}
function sanitizeVcId(vcId) {
  return vcId.replace(/\./g, "_");
}

// Main
function initCardUpvotes() {
  const buttons = document.querySelectorAll(".upvote-button");
  console.log("Found", buttons.length, "upvote buttons");

  buttons.forEach((button) => {
    const rawVcId = button.getAttribute("data-vc-id");
    const vcId = sanitizeVcId(rawVcId);
    const countEl = document.querySelector(`.upvote-count[data-vc-id="${rawVcId}"]`);
    const upvoteRef = ref(database, `upvotes/${vcId}/count`);

    // Initial load
    onValue(upvoteRef, (snapshot) => {
      const count = snapshot.val() || 0;
      if (countEl) countEl.textContent = count;
      button.disabled = hasUpvoted(vcId);
      console.log(`Loaded upvotes for ${vcId}:`, count);
    }, (error) => {
      console.error("Firebase read error:", error);
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (hasUpvoted(vcId)) {
        console.log("Already upvoted:", vcId);
        return;
      }

      console.log("Upvote clicked:", vcId);

      runTransaction(upvoteRef, (current) => (current || 0) + 1)
        .then(() => {
          console.log("Upvote recorded for:", vcId);
          addUpvoteToCookie(vcId);
          button.disabled = true;
        })
        .catch((error) => {
          console.error("Upvote transaction failed:", error);
        });
    });
  });
}

// DOM ready
document.addEventListener("DOMContentLoaded", initCardUpvotes);
