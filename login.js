import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCYPYVpVG2exZ7iUcUI_A8yg_984qJ68QY",
    authDomain: "akatare-leo.firebaseapp.com",
    projectId: "akatare-leo",
    storageBucket: "akatare-leo.firebasestorage.app",
    messagingSenderId: "979829794740",
    appId: "1:979829794740:web:38c167f96106b88935f4e1"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

let isLogin = true;
const signupFields = document.getElementById('signup-fields');
const toggleBtn = document.getElementById('toggle-auth');
const authTitle = document.getElementById('auth-title');
const submitBtn = document.getElementById('submit-btn');

// Toggle between Login and Sign Up
toggleBtn.onclick = () => {
    isLogin = !isLogin;
    signupFields.style.display = isLogin ? "none" : "block";
    authTitle.innerText = isLogin ? "LOGIN" : "SIGN UP";
    submitBtn.innerText = isLogin ? "Login" : "Create Account";
    toggleBtn.innerText = isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login";
};

document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        let userCredential;

        if (isLogin) {
            // Standard Login
            userCredential = await signInWithEmailAndPassword(auth, email, password);
        } else {
            // 1. Create the account
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Save Profile to Firestore
            const name = document.getElementById('user-name').value;
            const contact = document.getElementById('user-contact').value;

            await setDoc(doc(db, "users", user.uid), {
                name: name,
                contact: contact,
                email: email,
                createdAt: new Date()
            });
            
            localStorage.setItem('chatWithName', name);
            localStorage.setItem('chatWithContact', contact);
        }

        // --- THE FIX: Save ID for BOTH Login and Signup ---
        const user = userCredential.user;
        if (user) {
            localStorage.setItem('userId', user.uid);
            console.log("User ID locked in:", user.uid);
        }

        window.location.href = "index.html";
        
    } catch (error) {
        alert("Error: " + error.message);
    }
};
