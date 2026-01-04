import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, Timestamp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYPYVpVG2exZ7iUcUI_A8yg_984qJ68QY",
  authDomain: "akatare-leo.firebaseapp.com",
  projectId: "akatare-leo",
  storageBucket: "akatare-leo.firebasestorage.app",
  messagingSenderId: "979829794740",
  appId: "1:979829794740:web:38c167f96106b88935f4e1"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Get the product ID the user wants to promote
const targetId = localStorage.getItem('promoteId');

onAuthStateChanged(auth, async (user) => {
    if (!user || !targetId) {
        window.location.href = "dashboard.html";
        return;
    }

    // Load product preview
    const docRef = doc(db, "products", targetId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        const data = snap.data();
        document.getElementById('p-name').innerText = "Product: " + data.name;
        document.getElementById('p-price').innerText = `Price: ${data.price.amount} ${data.price.currency.toUpperCase()}`;
    }

    // Handle Promotion Trigger
    document.getElementById('confirm-promo-btn').onclick = async () => {
        // Calculate expiration: Now + 24 Hours
        const now = new Date();
        const expiryDate = new Date(now.getTime() + (24 * 60 * 60 * 1000));
        
        try {
            await updateDoc(docRef, {
                promoted: true,
                promotionExpires: Timestamp.fromDate(expiryDate)
            });

            alert("Success! Your product is now in the top carousel for 24 hours.");
            window.location.href = "dashboard.html";
        } catch (error) {
            console.error("Promotion failed:", error);
            alert("Could not promote item. Try again.");
        }
    };
});
