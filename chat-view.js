import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, doc, writeBatch } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 1. CONFIGURATION
const IMGBB_API_KEY = "adb892389a0236cb4ca26b076fc30604";
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

// Context from Inbox
const activeRoomId = localStorage.getItem('currentRoomId');
const chatPartnerName = localStorage.getItem('chatWithName') || "User";
const isOfficial = localStorage.getItem('isOfficialChannel') === 'true';

// DOM Elements
const messageArea = document.getElementById('message-area');
const inputContainer = document.getElementById('input-container');
const titleDisplay = document.getElementById('chat-title');

// 2. HELPER: NAME FORMATTING
function formatName(name) {
    if (!name) return "User";
    return name.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
}

// 3. UI SETUP
function setupUI() {
    const badge = `<svg width="16" height="16" viewBox="0 0 24 24" style="margin-left:5px;vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="gold"/><path d="M8 12.5L10.5 15L16 9" stroke="#075211" stroke-width="2.5" stroke-linecap="round"/></svg>`;
    titleDisplay.innerHTML = isOfficial ? `Akatare Official ${badge}` : formatName(chatPartnerName);

    if (isOfficial) {
        inputContainer.innerHTML = `<div class="read-only-banner">🔒 Broadcast channel. Replies disabled.</div>`;
    } else {
        inputContainer.innerHTML = `
            <div class="chat-footer">
                <input type="file" id="image-input" accept="image/*" style="display:none;">
                <span id="attach-btn" style="font-size:22px; cursor:pointer; color:#8696a0;">📎</span>
                <input type="text" id="msg-input" placeholder="Type a message...">
                <button id="send-btn" class="send-btn">➤</button>
            </div>`;

        document.getElementById('attach-btn').onclick = () => document.getElementById('image-input').click();
        document.getElementById('image-input').onchange = handleImageWorkflow;
        document.getElementById('send-btn').onclick = () => handleTextSend();
        document.getElementById('msg-input').onkeypress = (e) => { if (e.key === 'Enter') handleTextSend(); };
    }
    if (!isOfficial) {
        // NEW: Check if there is a draft message from the checkout page
        const draft = localStorage.getItem('draftMessage');
        const inputField = document.getElementById('msg-input');
        
        if (draft && inputField) {
            inputField.value = draft;
            // Clear the draft so it doesn't reappear next time they open the chat
            localStorage.removeItem('draftMessage'); 
        }
    }
}

// 4. IMAGE WORKFLOW (Compress -> Upload -> Save)
async function handleImageWorkflow(e) {
    const file = e.target.files[0];
    if (!file) return;

    const loader = showLoadingIndicator(true);
    try {
        const compressedBlob = await compressImage(file);
        const formData = new FormData();
        formData.append("image", compressedBlob);

        // FIXED: Corrected the URL from bb.com to api.imgbb.com
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { 
            method: "POST", 
            body: formData 
        });
        const result = await res.json();

        if (result.success) await saveToFirebase("", result.data.url);
    } catch (err) {
        console.error(err);
        alert("Upload failed. Check connection.");
    } finally {
        showLoadingIndicator(false, loader);
        e.target.value = "";
    }
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (ev) => {
            const img = new Image(); // FIXED: Added missing variable name 'img'
            img.src = ev.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(800 / img.width, 1); // FIXED: Added 'img' reference
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // FIXED: Added 'img' reference
                canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}

// 5. DATA HANDLING
async function handleTextSend() {
    const input = document.getElementById('msg-input');
    const val = input.value.trim();
    if (!val) return;
    await saveToFirebase(val, null);
    input.value = "";
}

async function saveToFirebase(text, imageUrl) {
    if (!activeRoomId || !auth.currentUser) return;
    await addDoc(collection(db, "messages"), {
        roomId: activeRoomId,
        senderId: auth.currentUser.uid,
        senderName: formatName(auth.currentUser.displayName || "User"),
        text: text,
        imageUrl: imageUrl,
        status: "sent",
        createdAt: serverTimestamp()
    });
}

// 6. REAL-TIME LISTENER & BLUE TICKS
function loadMessages(myUid) {
    let q;

    if (isOfficial) {
        q = query(
            collection(db, "messages"),
            where("roomId", "==", activeRoomId),
            where("receiverId", "==", myUid), 
            orderBy("createdAt", "asc")
        );
    } else {
        q = query(
            collection(db, "messages"),
            where("roomId", "==", activeRoomId),
            orderBy("createdAt", "asc")
        );
    }

    onSnapshot(q, (snapshot) => {
        const batch = writeBatch(db);
        let needsCommit = false;
        messageArea.innerHTML = "";

        snapshot.forEach((msgDoc) => {
            const data = msgDoc.data();
            const isMe = data.senderId === myUid;

            if (!isMe && data.status === "sent") {
                batch.update(doc(db, "messages", msgDoc.id), { status: "read" });
                needsCommit = true;
            }

            const time = data.createdAt ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';
            const tickColor = data.status === "read" ? "#34B7F1" : "#8696a0";
            const ticks = isMe ? `<span style="color:${tickColor}; margin-left:4px; font-size:10px;">✔✔</span>` : "";

            const bubble = document.createElement('div');
            bubble.className = `bubble ${isMe ? 'sent' : 'received'}`;
            bubble.innerHTML = `
                ${data.imageUrl ? `<img src="${data.imageUrl}" style="max-width:100%; border-radius:8px;" onclick="window.open('${data.imageUrl}')">` : `<p style="margin:0;">${data.text}</p>`}
                <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:4px;">
                    <span class="msg-time">${time}</span> ${ticks}
                </div>`;
            messageArea.appendChild(bubble);
        });

        if (needsCommit) batch.commit();
        messageArea.scrollTop = messageArea.scrollHeight;
    }, (error) => {
        console.error("Error loading messages:", error);
    });
}

function showLoadingIndicator(show, el) {
    if (show) {
        const div = document.createElement('div');
        div.style = "position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#075211; color:gold; padding:10px 20px; border-radius:30px; z-index:1000; font-size:12px; box-shadow:0 4px 15px rgba(0,0,0,0.4);";
        div.innerHTML = "Compressing & Sending...";
        document.body.appendChild(div);
        return div;
    } else if (el) { el.remove(); }
}

// START
onAuthStateChanged(auth, (user) => {
    if (user) { setupUI(); loadMessages(user.uid); }
    else { window.location.href = "login.html"; }
});
