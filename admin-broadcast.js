import { db, auth } from './db-init.js';
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

async function sendGlobalBroadcast(messageText) {
    const adminUser = auth.currentUser;
    if (!adminUser) return alert("Please log in as Admin");

    const confirmSend = confirm(`Send this to all users: "${messageText}"?`);
    if (!confirmSend) return;

    try {
        // 1. Get all users from your 'users' collection
        const usersSnap = await getDocs(collection(db, "users"));
        const batch = writeBatch(db);
        let count = 0;

        usersSnap.forEach((userDoc) => {
            const userId = userDoc.id;
            
            // 2. Create a message in the Official System Room for EACH user
            // Room format: akatare_official_system (filtered in your inbox.js)
            const msgRef = doc(collection(db, "messages"));
            batch.set(msgRef, {
                roomId: "akatare_official_system",
                receiverId: userId, // Specific to this user
                sender: "admin_system",
                senderName: "Akatare Official",
                text: messageText,
                status: "sent",
                createdAt: serverTimestamp()
            });
            count++;
        });

        await batch.commit();
        alert(`Broadcast successful! Sent to ${count} users.`);
    } catch (error) {
        console.error("Broadcast failed:", error);
        alert("Error sending broadcast.");
    }
}
