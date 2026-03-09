import { db, auth } from './db-init.js';
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 1. REAL-TIME STATS TRACKER
function trackStats() {
    // Watch Users
    onSnapshot(collection(db, "users"), (snap) => {
        document.getElementById('total-users').innerText = snap.size;
    });
    // Watch Products
    onSnapshot(collection(db, "products"), (snap) => {
        document.getElementById('total-products').innerText = snap.size;
    });
}


// Broadcast Logic for Akatare Admin
async function runBroadcast() {
    const input = document.getElementById('broadcast-input');
    const msg = input.value.trim();
    if (!msg) return;

    // 1. Create a UNIQUE ID for this specific broadcast session
    const broadcastId = "msg_" + Date.now(); 

    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const batch = writeBatch(db);

        usersSnap.forEach((userDoc) => {
            const userId = userDoc.id;
            
            // 2. FIXED: Assign a SPECIFIC ID to the document (BroadcastID + UserID)
            // This prevents duplicates because you can't have two docs with the same ID
            const msgRef = doc(db, "messages", `${broadcastId}_${userId}`);
            
            batch.set(msgRef, {
                roomId: "akatare_official_system",
                receiverId: userId,
                sender: "admin",
                senderName: "Akatare Official",
                text: msg,
                status: "sent",
                createdAt: serverTimestamp()
            });
        });

        await batch.commit();
        alert("Broadcast sent! Duplicates blocked.");
        input.value = "";
    } catch (err) {
        console.error("Broadcast error:", err);
    }
}

// Initialize
trackStats();
document.getElementById('broadcast-btn').onclick = runBroadcast;


// 3. CLEANUP TOOL: WIPE OFFICIAL MESSAGES
async function wipeOfficialMessages() {
    const status = document.getElementById('cleanup-status');
    
    if (!confirm("Are you sure? This will delete ALL messages in the Official Channel for EVERY user.")) return;
    if (!confirm("FINAL WARNING: This cannot be undone. Proceed?")) return;

    status.style.display = "block";
    status.innerText = "Searching for messages...";

    try {
        // Query only messages in the official system room
        const q = query(
            collection(db, "messages"), 
            where("roomId", "==", "akatare_official_system")
        );
        
        const snap = await getDocs(q);
        const batch = writeBatch(db);

        if (snap.empty) {
            status.innerText = "No messages found to delete.";
            setTimeout(() => status.style.display = "none", 3000);
            return;
        }

        snap.forEach((msgDoc) => {
            batch.delete(msgDoc.ref);
        });

        await batch.commit();
        status.innerText = `✅ Successfully deleted ${snap.size} messages.`;
        
        // Refresh the page stats
        setTimeout(() => location.reload(), 2000);

    } catch (err) {
        console.error("Cleanup failed:", err);
        status.innerText = "❌ Error: Could not delete messages.";
    }
}

// Attach to button
document.getElementById('clear-official-btn').onclick = wipeOfficialMessages;
