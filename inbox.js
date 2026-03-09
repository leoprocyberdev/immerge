import { db, auth } from './db-init.js';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// Helper to format names: "johns stores" -> "Johns Stores"
function initName(name) {
    if (!name) return "Akatare Business";
    return name.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        loadConversations(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

async function loadConversations(myUid) {
    const list = document.getElementById('dynamic-business-list');
    
    // 1. INSTANT LOAD: Check if we have a saved version on the phone
    const cachedChats = localStorage.getItem(`cache_inbox_${myUid}`);
    if (cachedChats) {
        list.innerHTML = cachedChats; // Shows the old list immediately
    }

    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));

    onSnapshot(q, async (snapshot) => {
        let newListHtml = "";
        const processedRooms = new Set();

        for (const msgDoc of snapshot.docs) {
            const data = msgDoc.data();
            
            if (data.roomId && data.roomId.includes(myUid)) {
                if (data.roomId === 'akatare_official_system') continue;

                if (!processedRooms.has(data.roomId)) {
                    processedRooms.add(data.roomId);

                    const parts = data.roomId.split('_');
                    const otherUid = parts.find(id => id !== myUid);
                    
                    // Note: You can also cache business names in a separate 
                    // localStorage key to speed up the 'getDoc' part
                    let businessDisplayName = "Akatare Seller";

                    if (otherUid) {
                        const userRef = doc(db, "users", otherUid);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) {
                            businessDisplayName = userSnap.data().businessName || userSnap.data().name || "Seller";
                        }
                    }

                    const cleanBusinessName = initName(businessDisplayName);
                    const time = data.createdAt ? data.createdAt.toDate().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '';

                    newListHtml += `
                        <div class="chat-item" onclick="openChat('${data.roomId}', '${cleanBusinessName}', false)">
                            <div class="avatar">
                                <img src="https://ui-avatars.com/api/?name=${cleanBusinessName}&background=075211&color=fff">
                            </div>
                            <div class="chat-info">
                                <div class="chat-top">
                                    <span class="name" style="color: #075211;">${cleanBusinessName}</span>
                                    <span class="time">${time}</span>
                                </div>
                                <span class="last-msg">${data.text || "📷 Image"}</span>
                            </div>
                        </div>
                    `;
                }
            }
        }

        // 2. UPDATE UI & REFRESH CACHE
        list.innerHTML = newListHtml;
        localStorage.setItem(`cache_inbox_${myUid}`, newListHtml);
    });
}



window.openChat = function(roomId, name, isOfficial) {
    localStorage.setItem('currentRoomId', roomId);
    localStorage.setItem('chatWithName', name);
    localStorage.setItem('isOfficialChannel', isOfficial);
    window.location.href = 'chat-view.html';
};
