import { auth, db } from './db-init.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Helper for formatting (re-defined here to ensure it works)
function formatName(name) {
    if (!name) return "User";
    return name.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const usernameDisplay = document.getElementById('welcome-username');
        const bizContainer = document.getElementById('biz-link-container');

        // 1. THE FIX: Fetch YOUR specific data from Firestore
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                
                // Set the correct name (Priority: Business Name > Personal Name > Auth Display Name)
                const myRealName = userData.businessName || userData.name || user.displayName || "User";
                usernameDisplay.innerText = formatName(myRealName);

                // 2. Business Link Logic
                if (userData.businessSlug) {
                    const slug = userData.businessSlug;
                    localStorage.setItem('userBusinessSlug', slug); // Cache for other pages
                    const shopUrl = `${window.location.origin}/shop.html?vendor=${slug}`;
                    bizContainer.innerHTML = `<a href="${shopUrl}" style="color: #075211; text-decoration: none; font-weight: bold;">🔗 View My Shop</a>`;
                } else {
                    bizContainer.innerHTML = `<span style="color: #888;">No business yet. <a href="dashboard.html" style="color: orange; text-decoration: none;">Claim one?</a></span>`;
                }
            } else {
                // Fallback for new users not yet in Firestore 'users' collection
                usernameDisplay.innerText = formatName(user.displayName || "User");
                bizContainer.innerHTML = `<span style="color: #888;">No business yet. <a href="dashboard.html" style="color: orange;">Claim one?</a></span>`;
            }
        } catch (error) {
            console.error("Error fetching account data:", error);
            usernameDisplay.innerText = "Akatare User";
        }

    } else {
        // Not logged in
        window.location.href = 'login.html';
    }
});

// Logout Handler
document.getElementById('logout-btn').onclick = () => {
    if(confirm("Are you sure you want to logout?")) {
        signOut(auth).then(() => {
            localStorage.clear(); // Clears all old "Support" names from memory
            window.location.href = "login.html";
        }).catch((error) => {
            alert("Logout failed: " + error.message);
        });
    }
};
