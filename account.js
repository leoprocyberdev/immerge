import { auth, db } from './db-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { formatName } from './utils/formatName.js';

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // 1. Set Username
        // Try localStorage first for speed, then Firestore for accuracy
        const rawName = localStorage.getItem('chatWithName') || "User";
        const cleanName = formatName(rawName);
        document.getElementById('welcome-username').innerText = cleanName || "User";

        // 2. Business Link Logic
        const bizContainer = document.getElementById('biz-link-container');
        let slug = localStorage.getItem('userBusinessSlug');

        if (!slug) {
            // Check Firestore if localStorage is empty (e.g., new browser)
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().businessSlug) {
                slug = userDoc.data().businessSlug;
                localStorage.setItem('userBusinessSlug', slug);
            }
        }

        if (slug) {
            const shopUrl = `${window.location.origin}/shop.html?vendor=${slug}`;
            bizContainer.innerHTML = `<a href="${shopUrl}" style="color: #075211; text-decoration: none; font-weight: bold;">🔗 View My Shop</a>`;
        } else {
            bizContainer.innerHTML = `<span style="color: #888;">No business yet. <a href="dashboard.html" style="color: orange;">Claim one?</a></span>`;
        }

    } else {
        window.location.href = 'login.html';
    }
});

// Logout Handler
document.getElementById('logout-btn').onclick = () => {
    if(confirm("Are you sure you want to logout?")) {
        signOut(auth).then(() => {
            localStorage.clear();
            window.location.href = "login.html";
        });
    }
};
