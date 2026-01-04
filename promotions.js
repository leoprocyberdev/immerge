import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, where, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
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

const carousel = document.querySelector(".carousel-container");
const dotsContainer = document.getElementById("dots");

let currentIndex = 0;
let autoPlayInterval;
let isScrolling = false; // Flag to prevent overlaps

// 1. DATA LISTENER
const q = query(collection(db, "products"), where("promoted", "==", true));

onSnapshot(q, (snapshot) => {
    let promoHtml = '';
    const now = new Date();

    if (snapshot.empty) {
        if(carousel) carousel.style.display = 'none';
        return;
    } else {
        if(carousel) carousel.style.display = 'flex';
    }

    snapshot.forEach((productDoc) => {
        const product = productDoc.data();
        const productId = productDoc.id;

        if (product.promotionExpires && now > product.promotionExpires.toDate()) {
            updateDoc(doc(db, "products", productId), { promoted: false });
            return; 
        }

        const imageSrc = (product.image && product.image.startsWith('http')) 
            ? product.image 
            : `images/${product.image || 'img.jpg'}`;

        promoHtml += `
        <div class="promoted-product" style="background-image:linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${imageSrc}')">
            <div class="overlay">
              <h3>${product.name}</h3>
              <div class="price">
                <span class="new-price">${fmtCurrency(product.price.amount)} ${product.price.currency.toUpperCase()}</span>
              </div>
              <div class="combo">${product.brand || 'Featured Deal'}</div>
              <button class="shop-btn" onclick="goToProduct('${productId}')">SHOP NOW</button>
            </div>
        </div>
        `;
    });

    carousel.innerHTML = promoHtml;
    currentIndex = 0; 
    initCarousel();
    startAutoPlay();
});

window.goToProduct = (id) => {
    localStorage.setItem('clickedid', id);
    window.location.href = "checkout.html";
};

// 2. THE NO-SHAKE SCROLL FUNCTION// Replace your scrollToIndex function with this exact version:// Replace your scrollToIndex function with this exact version:
function scrollToIndex(index) {
    const items = document.querySelectorAll(".promoted-product");
    if (!items[index] || !carousel || isScrolling) return;

    isScrolling = true;
    currentIndex = index;

    // 1. COMPLETELY DISABLE SNAP AND OVERFLOW
    // This stops the browser from trying to "correct" the position
    carousel.style.scrollSnapType = "none";
    carousel.style.overflowX = "hidden"; 

    const containerWidth = carousel.offsetWidth;
    const itemWidth = items[index].offsetWidth;
    const itemLeft = items[index].offsetLeft;
    
    // Calculate the center position
    const targetLeft = itemLeft - (containerWidth / 2) + (itemWidth / 2);

    // 2. USE THE NATIVE ANIMATION ATTRIBUTE
    carousel.scrollTo({
        left: targetLeft,
        behavior: "smooth"
    });

    // 3. WAIT FOR SMOOTH SCROLL TO FINISH (approx 600ms)
    setTimeout(() => {
        // Re-enable everything
        carousel.style.scrollSnapType = "x mandatory";
        carousel.style.overflowX = "auto";
        isScrolling = false;
        
        // Update the dots after the move is solid
        updateDots(index);
    }, 700); 
}




// 3. DOTS & UI
function initCarousel() {
    const items = document.querySelectorAll(".promoted-product");
    dotsContainer.innerHTML = ""; 

    items.forEach((_, i) => {
        const dot = document.createElement("span");
        dot.className = "dot";
        dot.onclick = () => {
            scrollToIndex(i);
            startAutoPlay();
        };
        dotsContainer.appendChild(dot);
    });

    updateDots(0);
}

function updateDots(activeIdx) {
    const dots = document.querySelectorAll(".dot");
    const items = document.querySelectorAll(".promoted-product");
    
    dots.forEach((d, i) => {
        d.classList.remove("active", "near");
        if (i === activeIdx) d.classList.add("active");
        else if (Math.abs(i - activeIdx) === 1) d.classList.add("near");
    });

    items.forEach((p, i) => {
        p.style.opacity = i === activeIdx ? "1" : "0.6";
        p.style.transform = i === activeIdx ? "scale(1)" : "scale(0.95)";
    });
}

// 4. AUTO-PLAY WITHOUT JITTER
function startAutoPlay() {
    if (autoPlayInterval) clearInterval(autoPlayInterval);

    autoPlayInterval = setInterval(() => {
        const items = document.querySelectorAll(".promoted-product");
        if (items.length <= 1) return;

        let nextIndex = (currentIndex + 1) % items.length;
        scrollToIndex(nextIndex);
    }, 5000);
}

// Event listeners to handle manual swiping
carousel.addEventListener('touchstart', () => clearInterval(autoPlayInterval));
carousel.addEventListener('touchend', () => {
    // Give it a moment to settle after a manual swipe
    setTimeout(() => {
        const items = document.querySelectorAll(".promoted-product");
        const center = carousel.scrollLeft + carousel.offsetWidth / 2;
        let closestIdx = 0;
        let minDiff = Infinity;

        items.forEach((item, i) => {
            const diff = Math.abs(center - (item.offsetLeft + item.offsetWidth / 2));
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        });
        currentIndex = closestIdx;
        updateDots(currentIndex);
        startAutoPlay();
    }, 100);
});
