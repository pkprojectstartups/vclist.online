// /assets/js/firebase-interaction.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, push, onValue, set, runTransaction } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCAA588yxf40QdEJghoEQqfh37AK828MKw",
  authDomain: "vc-comments.firebaseapp.com",
  databaseURL: "https://vc-comments-default-rtdb.firebaseio.com",  // ← add this line
  projectId: "vc-comments",
  storageBucket: "vc-comments.appspot.com",
  messagingSenderId: "114746372203",
  appId: "1:114746372203:web:6b08497167b5a6c46dc12e"
};


const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Utility to sanitize Firebase keys (no . # $ [ ])
function sanitizePath(path) {
  return path.replace(/[.#$[\]]/g, "_");
}

// Sanitize user inputs (basic escape)
function sanitizeInput(input) {
  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

// Cookie helpers to track if user has upvoted this firm
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 864e5);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(name + "=")) {
      return cookie.substring(name.length + 1);
    }
  }
  return "";
}

// Check if user has already upvoted this firm
function hasUpvoted(vcId) {
  const upvotedFirms = getCookie("upvotedFirms");
  if (!upvotedFirms) return false;
  return upvotedFirms.split(",").includes(vcId);
}

// Add this vcId to upvoted cookie list
function addUpvoteToCookie(vcId) {
  let upvotedFirms = getCookie("upvotedFirms");
  const arr = upvotedFirms ? upvotedFirms.split(",") : [];
  if (!arr.includes(vcId)) {
    arr.push(vcId);
    setCookie("upvotedFirms", arr.join(","), 30);
  }
}

// Main initialization function
function initFirebaseInteractions() {
  const body = document.body;
  const vcIdRaw = body.getAttribute("data-vc-key") || "";
  const vcId = sanitizePath(vcIdRaw);

  if (!vcId) {
    console.warn("VC ID not found in body[data-vc-key], skipping Firebase setup");
    return;
  }

  // Elements
  const upvoteButton = document.getElementById("upvoteButton");
  const upvoteCountEl = document.getElementById("upvoteCount");
  const commentForm = document.getElementById("commentForm");
  const usernameInput = document.getElementById("username");
  const commentInput = document.getElementById("comment");
  const commentStatus = document.getElementById("commentStatus");
  const commentsList = document.getElementById("commentsList");
  const commentsTitle = document.getElementById("commentsTitle");
  const noCommentsText = document.getElementById("noCommentsText");

  // Load and display upvotes count and disable if already upvoted
  const upvoteCountRef = ref(database, `upvotes/${vcId}/count`);
  onValue(upvoteCountRef, (snapshot) => {
    const count = snapshot.val() || 0;
    if (upvoteCountEl) upvoteCountEl.textContent = count;
    if (upvoteButton) {
      upvoteButton.disabled = hasUpvoted(vcId);
    }
  });

  // Upvote button click handler
  if (upvoteButton) {
    upvoteButton.addEventListener("click", () => {
      if (hasUpvoted(vcId)) return;

      const upvoteRef = ref(database, `upvotes/${vcId}/count`);
      runTransaction(upvoteRef, (currentCount) => {
        return (currentCount || 0) + 1;
      })
      .then(() => {
        addUpvoteToCookie(vcId);
        upvoteButton.disabled = true;
      })
      .catch(console.error);
    });
  }

  // Submit comment form handler
  if (commentForm) {
    commentForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = sanitizeInput(usernameInput.value.trim());
      const comment = sanitizeInput(commentInput.value.trim());

      if (!username || !comment) {
        alert("Please fill in both username and comment");
        return;
      }

      const commentsRef = ref(database, `comments/${vcId}`);
      push(commentsRef, {
        username,
        comment,
        timestamp: Date.now()
      })
      .then(() => {
        commentStatus.style.display = "block";
        commentForm.reset();
        setTimeout(() => {
          commentStatus.style.display = "none";
        }, 3000);
      })
      .catch(console.error);
    });
  }

  // Load and render comments list
  const commentsRef = ref(database, `comments/${vcId}`);
  onValue(commentsRef, (snapshot) => {
    commentsList.innerHTML = "";

    if (snapshot.exists()) {
      commentsTitle.style.display = "block";
      noCommentsText.style.display = "none";

      // Sort comments by timestamp ascending
      const comments = [];
      snapshot.forEach(childSnap => {
        comments.push(childSnap.val());
      });
      comments.sort((a, b) => a.timestamp - b.timestamp);

      for (const comment of comments) {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = `${comment.username}: ${comment.comment}`;
        commentsList.appendChild(li);
      }
    } else {
      commentsTitle.style.display = "none";
      noCommentsText.style.display = "block";
    }
  });
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initFirebaseInteractions);
