import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCYPYVpVG2exZ7iUcUI_A8yg_984qJ68QY",
  authDomain: "akatare-leo.firebaseapp.com",
  projectId: "akatare-leo",
  storageBucket: "akatare-leo.firebasestorage.app",
  messagingSenderId: "979829794740",
  appId: "1:979829794740:web:38c167f96106b88935f4e1"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const welcomeText = document.getElementById('welcome-user');
const listContainer = document.getElementById('my-products-list');
const productsCount = document.getElementById('total-products');
const likesCount = document.getElementById('total-likes');
const chatsContainer = document.getElementById('recent-chats-list');

// --- 1. AUTH & PROFILE LOAD ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        localStorage.setItem('userId', user.uid); // Ensure ID is always set
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if(welcomeText) welcomeText.innerText = `Welcome, ${userData.name}`;
            
            // --- SYNC BUSINESS DATA ---
            if (userData.businessSlug) {
                localStorage.setItem('userBusinessSlug', userData.businessSlug);
                localStorage.setItem('userBusinessName', userData.businessName);
                displayBusinessLink(); // Show the link immediately
            }

            loadUserProducts(user.uid);
            loadUserChats(user.uid);
        }
    }
});



// --- 2. MANAGE PRODUCTS ---
function loadUserProducts(uid) {
    const productQuery = query(collection(db, "products"), where("seller.uid", "==", uid));

    onSnapshot(productQuery, (snapshot) => {
        listContainer.innerHTML = "";
        let totalLikes = 0;
        const now = new Date(); 
        
        productsCount.innerText = snapshot.size;

        snapshot.forEach(async (productDoc) => {
            const p = productDoc.data();
            const id = productDoc.id;
            totalLikes += (p.likes || 0);
            
            const isSold = p.status === "sold";
            let isPromoted = p.promoted === true;
            let timeLabel = "";

            // 1. AUTOMATIC EXPIRY LOGIC
            if (isPromoted && p.promotionExpires) {
                const expiryDate = p.promotionExpires.toDate();
                if (now > expiryDate) {
                    await updateDoc(doc(db, "products", id), { promoted: false });
                    isPromoted = false;
                } else {
                    const diffMs = expiryDate - now;
                    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
                    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    timeLabel = `<br><small style="color:#d4af37;">Ends in: ${hoursLeft}h ${minsLeft}m</small>`;
                }
            }

            // --- 2. THE IMAGE DISPLAY FIX ---
            // Handles ImgBB links correctly
            const imageSrc = (p.image && p.image.startsWith('http')) 
                ? p.image 
                : `images/${p.image || 'img.jpg'}`;

            const item = document.createElement('div');
            item.className = 'dash-product';
            
            item.innerHTML = `
                <img src="${imageSrc}" class="dash-img" loading="lazy" style="filter: ${isSold ? 'grayscale(100%)' : 'none'}" onerror="this.src='images/img.jpg'">
                <div class="dash-info">
                    <p style="font-weight:bold; margin:0;">
                        ${p.name} 
                        ${isSold ? '<span style="color:red;">(SOLD)</span>' : ''}
                        ${isPromoted ? '<span style="color:#d4af37;">(🚀 PROMOTED)</span>' : ''}
                        ${timeLabel}
                    </p>
                    <p style="font-size:11px; color:#777; margin:2px 0;">
                        📍 ${p.location || 'No Location'} | 📁 ${p.category || 'General'}
                    </p>
                    <p style="font-size:12px; color:#666;">👍 Likes: ${p.likes || 0}</p>
                </div>
                <div class="dash-btns">
                    <button class="promo-btn" style="background: ${isPromoted ? '#e0e0e0' : 'gold'}; color: black; border: none; padding: 5px; border-radius: 5px; font-size: 11px; cursor: ${isPromoted ? 'default' : 'pointer'};">
                        ${isPromoted ? 'Active' : 'Promote ($1)'}
                    </button>
                    <button class="status-btn" style="background: ${isSold ? '#076e3b' : '#333'}; color: white; border: none; padding: 5px; border-radius: 5px; font-size: 11px;">
                        ${isSold ? 'Relist Item' : 'Mark Sold'}
                    </button>
                    <button class="del-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 5px;">Delete</button>
                </div>
            `;

            // 3. LOGIC HANDLERS
            item.querySelector('.promo-btn').onclick = () => {
                if(!isPromoted) {
                    localStorage.setItem('promoteId', id);
                    window.location.href = "promote.html";
                }
            };

            item.querySelector('.status-btn').onclick = async (e) => {
                const newStatus = e.target.innerText === "Mark Sold" ? "sold" : "available";
                await updateDoc(doc(db, "products", id), { status: newStatus });
            };

            item.querySelector('.del-btn').onclick = async () => {
                if(confirm(`Delete "${p.name}" forever?`)) {
                    await deleteDoc(doc(db, "products", id));
                }
            };

            listContainer.appendChild(item);
        });
        
        likesCount.innerText = totalLikes;
    });
}



// --- 3. RECENT MESSAGES ---
function loadUserChats(uid) {
    // RoomId contains UID in our system: [buyerUid_sellerUid]
    const chatQuery = query(collection(db, "messages"), orderBy("createdAt", "desc"));

    onSnapshot(chatQuery, (snapshot) => {
        chatsContainer.innerHTML = "";
        const uniqueRooms = new Set();

        snapshot.forEach((msgDoc) => {
            const msg = msgDoc.data();
            
            // Check if this chat belongs to the current user and show the latest message per room
            if (msg.roomId.includes(uid) && !uniqueRooms.has(msg.roomId)) {
                uniqueRooms.add(msg.roomId);

                const chatItem = document.createElement('div');
                chatItem.className = 'dash-product';
                chatItem.style.cursor = "pointer";
                chatItem.style.borderLeft = "4px solid #076e3b";
                
                chatItem.innerHTML = `
                    <div class="dash-info">
                        <p style="font-weight:bold; margin:0;">Message from ${msg.senderName || 'User'}</p>
                        <p style="font-size:13px; color:#444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${msg.text}
                        </p>
                    </div>
                    <div style="font-size:10px; color:#888;">
                        ${msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                    </div>
                `;

                chatItem.onclick = () => {
                    localStorage.setItem('currentRoomId', msg.roomId); 
                    window.location.href = `inbox.html`;
                };

                chatsContainer.appendChild(chatItem);
            }
        });

        if (uniqueRooms.size === 0) {
            chatsContainer.innerHTML = "<p style='padding:15px; font-size:14px; color:#888;'>No messages yet.</p>";
        }
    });
}

//Register business
window.claimBusiness = async function claimBusiness() {
    const name = document.getElementById('biz-name-input').value;
    const userId = localStorage.getItem('userId'); // Ensure you save UID during login

    if (!name) return alert("Please enter a name");

    const response = await fetch("https://leopro256-nodeserver.hf.space/register-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: name, userId: userId })
    });

    const result = await response.json();

    if (result.success) {
        alert("Success! Your shop is live at: " + result.shareUrl);
        // Save the slug locally so we can use it when they post products
        localStorage.setItem('userBusinessSlug', result.slug);
        location.reload(); 
    } else {
        alert("Error: " + result.message);
    }
}

//the business link

window.displayBusinessLink = function() {
    const slug = localStorage.getItem('userBusinessSlug');
    const bizName = localStorage.getItem('userBusinessName');
    const setupSection = document.getElementById('business-setup');
    const activeCard = document.getElementById('active-shop-card');

    if (slug && slug !== "undefined") {
        // Hide the "Claim" form and show the "Active" card
        if(setupSection) setupSection.style.display = 'none';
        activeCard.style.display = 'block';

        const fullUrl = `${location.origin}/shop?vendor=${slug}`;
        
        document.getElementById('display-biz-name').innerText = bizName;
        document.getElementById('shop-link-url').innerText = fullUrl;
        document.getElementById('shop-link-url').href = fullUrl;
    }
};

// Run this when the page opens
window.addEventListener('load', displayBusinessLink);


// Function to check and show the business link permanently
async function loadPermanentBusinessLink() {
    const userId = localStorage.getItem('userId');
    const setupSection = document.getElementById('business-setup');
    const activeCard = document.getElementById('active-shop-card');

    if (!userId) return; // Not logged in

    // 1. Check if we already have the slug in LocalStorage
    let slug = localStorage.getItem('userBusinessSlug');
    let bizName = localStorage.getItem('userBusinessName');

    // 2. If it's missing from LocalStorage, fetch it from Firestore (The safety net)
    if (!slug) {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists() && userDoc.data().businessSlug) {
                slug = userDoc.data().businessSlug;
                bizName = userDoc.data().businessName;
                // Save it back to LocalStorage so it's faster next time
                localStorage.setItem('userBusinessSlug', slug);
                localStorage.setItem('userBusinessName', bizName);
            }
        } catch (err) {
            console.error("Error fetching business info:", err);
        }
    }

    // 3. If a slug exists, show the "Live" card and hide the "Claim" form
    if (slug) {
        if(setupSection) setupSection.style.display = 'none';
        if(activeCard) {
            activeCard.style.display = 'block';
            const fullUrl = `${location.origin}/shop?vendor=${slug}`;
            document.getElementById('display-biz-name').innerText = bizName;
            document.getElementById('shop-link-url').innerText = fullUrl;
            document.getElementById('shop-link-url').href = fullUrl;
        }
    }
}

// Trigger this as soon as the page finishes loading
window.addEventListener('DOMContentLoaded', loadPermanentBusinessLink);
