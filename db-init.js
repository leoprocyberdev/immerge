// db-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYPYVpVG2exZ7iUcUI_A8yg_984qJ68QY",
  authDomain: "akatare-leo.firebaseapp.com",
  projectId: "akatare-leo",
  storageBucket: "akatare-leo.firebasestorage.app",
  messagingSenderId: "979829794740",
  appId: "1:979829794740:web:38c167f96106b88935f4e1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export for other files (shop.js, login.js, etc.)
export const db = getFirestore(app);
export const auth = getAuth(app);

import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

enableIndexedDbPersistence(db).catch((err) => {
    console.error("Persistence failed", err.code);
});
