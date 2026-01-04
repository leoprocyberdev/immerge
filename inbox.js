import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 1. Firebase Configuration
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

// DOM Elements
const messageInput = document.querySelector('.foot input');
const sendBtn = document.querySelector('.foot button');
const chatContainer = document.querySelector('.content');
const pageTitle = document.querySelector('.title');

let currentUserProfile = null;
let activeRoomId = localStorage.getItem('currentRoomId');

// 2. Auth Protection & Profile Fetch
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        // Get the logged-in user's name for the "senderName" field
        const userDoc = await getDoc(doc(db, "users", user.uid));
        currentUserProfile = userDoc.exists() ? userDoc.data() : { name: "Buyer" };
        
        console.log("Chatting as:", currentUserProfile.name);
        setupChat(user);
    }
});

function setupChat(user) {
    const sellerName = localStorage.getItem('chatWithName') || "Seller";
    const interestedProduct = localStorage.getItem('interestedProduct');
    
    pageTitle.innerText = `Chat: ${sellerName}`;

    // Auto-fill interest message if first time opening from checkout
    if (interestedProduct) {
        messageInput.value = `Hi ${sellerName}, I'm interested in "${interestedProduct}". Is it still available?`;
        localStorage.removeItem('interestedProduct');
    }

    // Load Messages
    loadMessages(user.uid);

    // Send Button Click
    sendBtn.onclick = () => sendMessage(user.uid);
    
    // Enter Key Support
    messageInput.onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage(user.uid);
    };
}

// 3. Send Message Function
async function sendMessage(myUid) {
    const text = messageInput.value.trim();
    if (text !== "" && activeRoomId) {
        try {
            await addDoc(collection(db, "messages"), {
                roomId: activeRoomId,
                text: text,
                sender: myUid,
                senderName: currentUserProfile.name,
                createdAt: serverTimestamp()
            });
            messageInput.value = ""; 
        } catch (error) {
            console.error("Message failed:", error);
        }
    }
}

// 4. Real-time Message Listener
function loadMessages(myUid) {
    if (!activeRoomId) return;

    const q = query(
        collection(db, "messages"),
        where("roomId", "==", activeRoomId),
        orderBy("createdAt", "asc")
    );

    

    onSnapshot(q, (snapshot) => {
        // Clear previous bubbles to avoid duplicates on redraw
        const bubbles = document.querySelectorAll('.msg-bubble');
        bubbles.forEach(b => b.remove());

        snapshot.forEach((doc) => {
            const msg = doc.data();
            const isMe = msg.sender === myUid;
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `msg-bubble ${isMe ? 'msg-sent' : 'msg-received'}`;
            
            // Format time
            const time = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...';

            msgDiv.innerHTML = `
                <div class="msg-content">
                    <p>${msg.text}</p>
                    <span class="msg-time" style="font-size:10px; opacity:0.7; display:block; text-align:right;">${time}</span>
                </div>
            `;
            
            // Insert before the footer input
            chatContainer.insertBefore(msgDiv, document.querySelector('.foot'));
        });

        // Scroll to bottom
        window.scrollTo(0, document.body.scrollHeight);
    });
}
