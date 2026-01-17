import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, limit, startAfter, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { fmtCurrency } from './utils/formatCurrency.js';

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

const htmlContainer = document.querySelector('.container');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchBar = document.getElementById('search-bar'); 
const searchInput = document.querySelector('.search-input');
const searchSubmit = document.querySelector('.search-submit');
const searchX = document.querySelector('.search-x');
const micBtn = document.getElementById('mic-btn');
const recentBox = document.getElementById('recent-searches');

let lastVisibleDoc = null;
const BATCH_SIZE = 15;

// --- 1. PRODUCT FETCHING & CACHING ---
async function fetchProducts(isLoadMore = false) {
    try {
        if (!isLoadMore) {
            htmlContainer.innerHTML = '';
            for(let i=0; i<6; i++) {
                htmlContainer.innerHTML += `
                    <div class="skeleton-card">
                        <div class="skeleton-img shimmer"></div>
                        <div class="skeleton-text shimmer"></div>
                        <div class="skeleton-text short shimmer"></div>
                    </div>`;
            }
        }

        let q = isLoadMore && lastVisibleDoc 
            ? query(collection(db, "products"), orderBy("name", "asc"), startAfter(lastVisibleDoc), limit(BATCH_SIZE))
            : query(collection(db, "products"), orderBy("name", "asc"), limit(BATCH_SIZE));

        const querySnapshot = await getDocs(q);
        if (!isLoadMore) htmlContainer.innerHTML = '';

        if (querySnapshot.empty) {
            if (!isLoadMore) htmlContainer.innerHTML = "<center><h3>No products found.</h3></center>";
            if (loadMoreBtn) loadMoreBtn.style.display = "none";
            return;
        }

        lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        querySnapshot.forEach((doc) => renderProductElement(doc));

        if (loadMoreBtn) loadMoreBtn.style.display = querySnapshot.size < BATCH_SIZE ? "none" : "block";
    } catch (error) {
        console.error("Error:", error);
        htmlContainer.innerHTML = "<center><h3>Connection error.</h3></center>";
    }
}

// Optimized rendering helper for both Search and Main Grid
function renderProductElement(doc) {
    const product = doc.data();
    const productId = doc.id;
    const imageSrc = (product.image && product.image.startsWith('http')) ? product.image : `images/${product.image || 'img.jpg'}`;

    const productDiv = document.createElement('div');
    productDiv.className = 'product';
    productDiv.style.animation = "fadeIn 0.5s ease forwards";

    productDiv.innerHTML = `
     <div class="item-card">
       <center><img src="${imageSrc}" loading="lazy" onerror="this.src='images/img.jpg'"></center>
       <h5>${product.name}</h5>
       <h4>UGX ${fmtCurrency(product.price.amount)} =</h4>
       <center><button>Shop now</button></center>
     </div>
    `;

    // THE SPEED FIX: Save to cache on click for instant checkout load
    productDiv.onclick = () => {
        localStorage.setItem('clickedid', productId);
        localStorage.setItem(`cache_${productId}`, JSON.stringify({ ...product, id: productId }));
        window.location.href = 'checkout.html';
    };

    htmlContainer.appendChild(productDiv);
}

// --- 2. SEARCH LOGIC ---
async function performSearch() {
    const term = searchInput.value.trim().toLowerCase();
    recentBox.style.display = 'none';
    if (term === "") { fetchProducts(); return; }

    saveSearchHistory(term);
    htmlContainer.innerHTML = '<div style="text-align:center; width:100%; margin-top:50px;">Searching...</div>';

    try {
        const q = query(collection(db, "products"), orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        htmlContainer.innerHTML = '';
        let found = false;

        querySnapshot.forEach((doc) => {
            const p = doc.data();
            if (p.name.toLowerCase().includes(term) || (p.category || "").toLowerCase().includes(term)) {
                renderProductElement(doc);
                found = true;
            }
        });

        if (!found) htmlContainer.innerHTML = `<center><p style="margin-top:50px;">No results for "${term}"</p></center>`;
    } catch (err) { console.error(err); }
}

// --- 3. SEARCH UI & HISTORY ---
window.toggleSearch = () => {
    if (searchBar.style.display === 'grid') {
        searchBar.style.display = 'none';
        recentBox.style.display = 'none';
    } else {
        searchBar.style.display = 'grid';
        searchInput.focus();
    }
};

function saveSearchHistory(term) {
    let history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    history = history.filter(item => item !== term);
    history.unshift(term);
    if (history.length > 5) history.pop();
    localStorage.setItem('searchHistory', JSON.stringify(history));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem('searchHistory')) || [];
    if (history.length === 0 || searchInput.value !== "") { recentBox.style.display = 'none'; return; }
    let html = '<div class="recent-title">Recent Searches</div>';
    history.forEach(term => { html += `<div class="recent-item" onclick="quickSearch('${term}')">🕒 ${term}</div>`; });
    html += `<div class="clear-history" onclick="clearAllHistory(event)">Clear History</div>`;
    recentBox.innerHTML = html;
    recentBox.style.display = 'block';
}

window.clearAllHistory = (e) => {
    e.stopPropagation();
    if(confirm("Clear history?")) { localStorage.removeItem('searchHistory'); recentBox.style.display = 'none'; }
};

window.quickSearch = (term) => { searchInput.value = term; performSearch(); };

// --- 4. VOICE SEARCH ---
const recognition = (window.SpeechRecognition || window.webkitSpeechRecognition) ? new (window.SpeechRecognition || window.webkitSpeechRecognition)() : null;
if (recognition) {
    micBtn.onclick = () => recognition.start();
    recognition.onstart = () => { micBtn.classList.add('listening-pulse'); searchInput.placeholder = "Listening..."; };
    recognition.onresult = (e) => { searchInput.value = e.results[0][0].transcript; performSearch(); };
    recognition.onend = () => { micBtn.classList.remove('listening-pulse'); searchInput.placeholder = "Search..."; };
}

// --- 5. INITIALIZATION & LISTENERS ---
searchX.onclick = () => { searchInput.value = ""; toggleSearch(); fetchProducts(); };
searchSubmit.onclick = performSearch;
searchInput.onkeydown = (e) => { if (e.key === 'Enter') performSearch(); };
searchInput.onfocus = showHistory;
if (loadMoreBtn) loadMoreBtn.onclick = () => fetchProducts(true);

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search') && !e.target.closest('.recent-box')) recentBox.style.display = 'none';
});

fetchProducts();

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const countElement = document.getElementById('cart-count');
    if (countElement) {
        countElement.innerText = cart.length;
    }
}
// Run this whenever the page loads
updateCartCount();
