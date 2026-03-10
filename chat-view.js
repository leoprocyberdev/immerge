import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, doc, writeBatch } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// 1. CONFIGURATION
const IMGBB_API_KEY = "adb892389a0236cb4ca26b076fc30604";
const HF_BACKEND_URL = "https://leopro256-nodeserver.hf.space/upload-audio";

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

// Context
const activeRoomId = localStorage.getItem('currentRoomId');
const chatPartnerName = localStorage.getItem('chatWithName') || "User";
const isOfficial = localStorage.getItem('isOfficialChannel') === 'true';

// DOM Elements
const messageArea = document.getElementById('message-area');
const titleDisplay = document.getElementById('chat-title');
let mediaRecorder;
let audioChunks = [];
let audioContext, analyser, dataArray, animationId, timerInterval;

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
        document.querySelector('.chat-footer').innerHTML = `<div class="read-only-banner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                This is a broadcast channel. Replies are disabled.
            </div>`;
    } else {
        const msgInput = document.getElementById('msg-input');
        const sendBtn = document.getElementById('send-btn');
        const recordBtn = document.getElementById('record-btn');
        const imageInput = document.getElementById('image-input');

        msgInput.addEventListener('input', () => {
            if (msgInput.value.trim().length > 0) {
                sendBtn.classList.remove('hidden');
                recordBtn.classList.add('hidden');
            } else {
                sendBtn.classList.add('hidden');
                recordBtn.classList.remove('hidden');
            }
        });

        sendBtn.onclick = () => handleTextSend();
        recordBtn.onclick = () => handleVoiceNote();
        imageInput.onchange = (e) => handleImageWorkflow(e);
        msgInput.onkeypress = (e) => { if (e.key === 'Enter') handleTextSend(); };
    }
}

// 4. AUDIO LOGIC (Amplified + Visualized)
async function handleVoiceNote() {
    const recordBtn = document.getElementById('record-btn');
    
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = 3.0; // Boosted volume
            
            analyser = audioContext.createAnalyser();
            source.connect(gainNode);
            gainNode.connect(analyser);
            
            const destination = audioContext.createMediaStreamDestination();
            gainNode.connect(destination);

            mediaRecorder = new MediaRecorder(destination.stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
            mediaRecorder.onstop = async () => {
                stopVisualizer();
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result;
                    const loader = showStatusIndicator("Uploading Voice Note...");
                    try {
                        const res = await fetch(HF_BACKEND_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ audio: base64Audio })
                        });
                        const data = await res.json();
                        if (data.url) await saveToFirebase("", null, data.url);
                    } catch (err) {
                        alert("Voice note failed to send.");
                    } finally {
                        showStatusIndicator(null, loader);
                    }
                };
            };

            mediaRecorder.start();
            startVisualizer(stream);
            startTimer();
            recordBtn.classList.add('recording-pulse');
        } catch (err) {
            alert("Microphone access denied.");
        }
    } else {
        mediaRecorder.stop();
        stopTimer();
        recordBtn.classList.remove('recording-pulse');
    }
}

// 5. VISUALIZER & TIMER
function startVisualizer(stream) {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    canvas.classList.remove('hidden');
    document.querySelector('.input-wrapper').classList.add('recording-ui');
    analyser.fftSize = 32;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00a884'; 
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            ctx.fillRect(x, canvas.height - barHeight, 3, barHeight);
            x += 5;
        }
    }
    draw();
}

function stopVisualizer() {
    cancelAnimationFrame(animationId);
    document.getElementById('visualizer').classList.add('hidden');
    document.querySelector('.input-wrapper').classList.remove('recording-ui');
}

function startTimer() {
    let sec = 0;
    const timerEl = document.getElementById('recording-timer');
    if(timerEl) timerEl.classList.remove('hidden');
    timerInterval = setInterval(() => {
        sec++;
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        if(timerEl) timerEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    const timerEl = document.getElementById('recording-timer');
    if(timerEl) {
        timerEl.classList.add('hidden');
        timerEl.innerText = "0:00";
    }
}

// 6. REAL-TIME LISTENER & OFFICIAL FILTER FIX
function loadMessages(myUid) {
    let q;

    if (isOfficial) {
        // THE FIX: receiverId check prevents duplicates in Official Channel
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
            
            let content = "";
            if (data.text) content += `<p style="margin:0;">${data.text}</p>`;
            if (data.imageUrl) content += `<img src="${data.imageUrl}" style="max-width:100%; border-radius:8px; margin-top:5px;" onclick="window.open('${data.imageUrl}')">`;
            
            if (data.audioUrl) {
                const audioId = `audio-${msgDoc.id}`;
                content += `
                <div class="custom-audio-player">
                    <button class="play-btn" onclick="toggleAudio('${data.audioUrl}', '${audioId}')" id="btn-${audioId}">▶</button>
                    <div class="audio-progress"><div class="progress-fill" id="fill-${audioId}"></div></div>
                    <span class="msg-time" style="margin:0 0 0 5px;" id="time-${audioId}">0:00</span>
                </div>
                <audio id="${audioId}" src="${data.audioUrl}" style="display:none;"></audio>`;
            }

            bubble.innerHTML = `${content} <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:4px;"><span class="msg-time">${time}</span> ${ticks}</div>`;
            messageArea.appendChild(bubble);
        });

        if (needsCommit) batch.commit();
        
        setTimeout(() => {
            messageArea.scrollTo({
                top: messageArea.scrollHeight,
                behavior: 'smooth' // Makes it look like WhatsApp
            });
        }, 100); // 100ms is the "sweet spot" for mobile browsers
    });
}

// 7. DATA HANDLING
async function handleTextSend() {
    const input = document.getElementById('msg-input');
    const val = input.value.trim();
    if (!val) return;
    await saveToFirebase(val, null, null);
    input.value = "";
    document.getElementById('send-btn').classList.add('hidden');
    document.getElementById('record-btn').classList.remove('hidden');
}

async function saveToFirebase(text, imageUrl, audioUrl) {
    if (!activeRoomId || !auth.currentUser) return;
    await addDoc(collection(db, "messages"), {
        roomId: activeRoomId,
        senderId: auth.currentUser.uid,
        senderName: formatName(auth.currentUser.displayName || "User"),
        text: text,
        imageUrl: imageUrl,
        audioUrl: audioUrl,
        status: "sent",
        createdAt: serverTimestamp()
    });
}

// 8. IMAGE WORKFLOW
async function handleImageWorkflow(e) {
    const file = e.target.files[0];
    if (!file) return;
    const loader = showStatusIndicator("Compressing Image...");
    try {
        const compressedBlob = await compressImage(file);
        const formData = new FormData();
        formData.append("image", compressedBlob);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const result = await res.json();
        if (result.success) await saveToFirebase("", result.data.url, null);
    } catch (err) {
        alert("Image upload failed.");
    } finally {
        showStatusIndicator(null, loader);
        e.target.value = "";
    }
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (ev) => {
            const img = new Image();
            img.src = ev.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(800 / img.width, 1);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7);
            };
        };
    });
}

// 9. GLOBAL AUDIO CONTROL
window.toggleAudio = (url, id) => {
    const audio = document.getElementById(id);
    const btn = document.getElementById(`btn-${id}`);
    const fill = document.getElementById(`fill-${id}`);
    const timeDisplay = document.getElementById(`time-${id}`);

    if (audio.paused) {
        audio.play();
        btn.innerText = "⏸";
        audio.ontimeupdate = () => {
            const pct = (audio.currentTime / audio.duration) * 100;
            fill.style.width = pct + "%";
            const mins = Math.floor(audio.currentTime / 60);
            const secs = Math.floor(audio.currentTime % 60);
            timeDisplay.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };
        audio.onended = () => { btn.innerText = "▶"; fill.style.width = "0%"; };
    } else {
        audio.pause();
        btn.innerText = "▶";
    }
};

function showStatusIndicator(msg, el) {
    if (msg) {
        const div = document.createElement('div');
        div.style = "position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:#075211; color:white; padding:8px 16px; border-radius:20px; z-index:1000; font-size:12px;";
        div.innerHTML = msg;
        document.body.appendChild(div);
        return div;
    } else if (el) { el.remove(); }
}

onAuthStateChanged(auth, (user) => {
    if (user) { setupUI(); loadMessages(user.uid); }
    else { window.location.href = "login.html"; }
});
