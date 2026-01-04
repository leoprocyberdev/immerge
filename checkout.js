import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
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
const auth = getAuth(app);

const container = document.querySelector('.container');
const myId = localStorage.getItem('clickedid');

// --- 1. UI STYLING ---
const style = document.createElement('style');
style.innerHTML = `
    .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #076e3b; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    
    .cart-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 12px 25px; border-radius: 30px; z-index: 10000; display: none; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
    
    .fullscreen-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.95); z-index: 20000; justify-content: center; align-items: center; cursor: zoom-out; }
    .fullscreen-overlay img { max-width: 95%; max-height: 90%; border-radius: 10px; transition: transform 0.3s ease; }
    .close-view { position: absolute; top: 20px; right: 20px; color: white; font-size: 40px; font-weight: bold; cursor: pointer; }
`;
document.head.appendChild(style);

// Fullscreen Viewer Container
const viewer = document.createElement('div');
viewer.id = 'fullscreen-viewer';
viewer.className = 'fullscreen-overlay';
viewer.innerHTML = `<span class="close-view">&times;</span><img id="fullscreen-img">`;
document.body.appendChild(viewer);

// --- 2. AUTH & INITIALIZATION ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        initPage(user);
    }
});

async function initPage(currentUser) {
    if (!myId) {
        container.innerHTML = "<center><h3 style='margin-top:100px;'>No product selected.</h3></center>";
        return;
    }

    // Load from Local Cache for instant display
    const cachedData = localStorage.getItem(`cache_${myId}`);
    if (cachedData) {
        renderHTML(JSON.parse(cachedData), currentUser);
    } else {
        container.innerHTML = `<div style="text-align:center; margin-top:100px;"><div class="spinner"></div><p>Loading Product...</p></div>`;
    }

    // Background Update from Firebase
    try {
        const docRef = doc(db, "products", myId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const freshProduct = docSnap.data();
            localStorage.setItem(`cache_${myId}`, JSON.stringify(freshProduct));
            renderHTML(freshProduct, currentUser); 
        }
    } catch (e) { console.error("Firebase update failed", e); }
}

// --- 3. RENDER UI ---
function renderHTML(product, currentUser) {
    const isSold = product.status === "sold";
    const sellerName = product.seller?.name || "Market Seller";
    const sellerContact = product.seller?.contact || "";
    const imageSrc = (product.image && product.image.startsWith('http')) ? product.image : `images/${product.image || 'img.jpg'}`;

    container.innerHTML = `
        <div class="product-detail-view" style="padding-bottom: 50px;">
            <center>
                <h2 style="color:#076e3b; margin:20px 0;">${product.name}</h2>
                <div style="position: relative; display: inline-block; width: 90%;">
                    ${isSold ? '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%) rotate(-15deg); background:rgba(255,0,0,0.8); color:white; padding:10px 20px; font-weight:bold; border:4px solid white; z-index:10; font-size:24px;">SOLD OUT</div>' : ''}
                    <img class="img" id="main-product-img" src="${imageSrc}" style="width:100%; border-radius:15px; cursor: zoom-in; filter: ${isSold ? 'grayscale(100%)' : 'none'}" onerror="this.src='images/img.jpg'">
                </div>
            </center>
            
            <div style="padding: 15px;">
                <p style="color: #076e3b; font-weight: bold; margin-bottom:5px;">
                    Category: ${product.category?.toUpperCase() || 'General'} | Brand: ${product.brand || 'Local'}
                </p>
                <p style="font-size: 15px; color: #444; line-height:1.5;">${product.description || 'No description provided.'}</p>
                
                <div style="background: #f9f9f9; padding: 15px; border-radius: 10px; border: 1px solid #eee; margin: 15px 0;">
                    <h4 style="margin:0 0 10px 0; color: #075211;">Seller & Location</h4>
                    <p style="margin:5px 0;">👤 <b>${sellerName}</b></p>
                    <p style="margin:5px 0;">📍 Location: <b>${product.location || 'Ishaka'}</b></p>
                </div>

                <div style="margin-top:20px;">
                    <span style="font-size:24px; font-weight:bold; color:#076e3b;">${fmtCurrency(product.price.amount)} ${product.price.currency.toUpperCase()}</span>
                    <button id="like-btn" style="float:right; background:none; border:1px solid #ddd; padding:5px 12px; border-radius:20px; cursor:pointer;">
                        👍 <span id="like-count">${product.likes || 0}</span>
                    </button>
                </div>
            </div>

            <center style="margin-top: 30px;">
                ${isSold ? `
                    <button class="cartbtn" disabled style="background-color: #ccc; width:90%;">Product Sold Out</button>
                ` : `
                    <button class="cartbtn" id="add-to-cart" style="background-color: #f39c12; width:90%; margin-bottom: 12px;">🛒 Save to Cart</button>
                    <button class="cartbtn" id="share-btn" style="background-color: #3498db; width:90%; margin-bottom: 12px;">🔗 Share Product</button>
                    <button class="cartbtn" id="message-seller-btn" style="background-color: #076e3b; width:90%; margin-bottom: 12px;">Message Seller</button>
                    <a href="https://wa.me/${sellerContact.replace(/\+/g, '')}?text=Hello ${sellerName}, I am interested in ${product.name}." target="_blank" style="text-decoration:none;">
                        <button class="cartbtn" style="background-color: #25D366; width:90%;">WhatsApp Seller</button>
                    </a>
                `}
            </center>
            <div id="toast" class="cart-toast">Item Saved to Cart!</div>
        </div>
    `;

    attachEvents(product, currentUser, sellerName, sellerContact);
}

// --- 4. EVENT HANDLERS ---
function attachEvents(product, user, sellerName, sellerContact) {
    const productImage = document.getElementById('main-product-img');
    const viewer = document.getElementById('fullscreen-viewer');
    const fullImg = document.getElementById('fullscreen-img');
    const cartBtn = document.getElementById('add-to-cart');
    const likeBtn = document.getElementById('like-btn');
    const msgBtn = document.getElementById('message-seller-btn');
    const shareBtn = document.getElementById('share-btn');

    // Fullscreen View
    if (productImage) {
        productImage.onclick = () => {
            fullImg.src = productImage.src;
            viewer.style.display = 'flex';
        };
    }
    viewer.onclick = () => { viewer.style.display = 'none'; };

    // Share Product Logic
    if (shareBtn) {
        shareBtn.onclick = async () => {
            const shareData = {
                title: product.name,
                text: `Check out this ${product.name} on Ishaka Market! Price: ${product.price.amount} ${product.price.currency}`,
                url: window.location.href 
            };
            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(`${shareData.text} \nLink: ${shareData.url}`);
                    alert("Link copied to clipboard!");
                }
            } catch (err) { console.error("Share failed", err); }
        };
    }

    // Save to Cart Logic
    if (cartBtn) {
        cartBtn.onclick = () => {
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const item = { 
                id: myId, 
                name: product.name, 
                image: product.image,
                price: { amount: product.price.amount, currency: product.price.currency } 
            };
            
            if (!cart.find(c => c.id === myId)) {
                cart.push(item);
                localStorage.setItem('cart', JSON.stringify(cart));
            }
            
            const toast = document.getElementById('toast');
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 2000);
        };
    }

    // Like logic
    if (likeBtn) {
        likeBtn.onclick = async () => {
            const countSpan = document.getElementById('like-count');
            countSpan.innerText = parseInt(countSpan.innerText) + 1;
            await updateDoc(doc(db, "products", myId), { likes: increment(1) });
        };
    }

    // Messaging logic
    if (msgBtn) {
        msgBtn.onclick = () => {
            localStorage.setItem('chatWithName', sellerName);
            localStorage.setItem('chatWithContact', sellerContact);
            const roomId = [user.uid, product.seller.uid].sort().join('_');
            localStorage.setItem('currentRoomId', roomId);
            window.location.href = "inbox.html";
        };
    }
}
