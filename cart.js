import { fmtCurrency } from './utils/formatCurrency.js';

// DOM Selections
const cartContainer = document.getElementById('cart-container');
const totalDisplay = document.getElementById('cart-total');

/**
 * Loads and displays items from LocalStorage
 */
function loadCart() {
    // 1. Get the cart or an empty array
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // 2. Handle Empty State
    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <center style="margin-top:100px; padding: 20px;">
                <div style="font-size: 50px; opacity: 0.3;">🛒</div>
                <h3 style="color: #666;">Your cart is empty</h3>
                <p style="color: #999;">Save items here to buy them later.</p>
                <button onclick="window.location.href='index.html'" 
                        style="background:#076e3b; color:white; border:none; padding:10px 20px; border-radius:5px; margin-top:20px;">
                    Start Shopping
                </button>
            </center>`;
        totalDisplay.innerText = "0";
        return;
    }

    // 3. Render Cart Items
    let html = '';
    let total = 0;

    cart.forEach((item, index) => {
        // Safe check for price data to prevent the 'amount' error
        const priceAmount = (item.price && item.price.amount) ? parseFloat(item.price.amount) : 0;
        const currency = (item.price && item.price.currency) ? item.price.currency.toUpperCase() : "UGX";
        const image = item.image || 'images/img.jpg';

        total += priceAmount;

        html += `
            <div class="cart-item" style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee; background: white; margin: 10px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                
                <div style="display: flex; align-items: center; flex: 1; cursor: pointer;" onclick="goToProduct('${item.id}')">
                    <img src="${image}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;" onerror="this.src='images/img.jpg'">
                    <div class="cart-details">
                        <b style="color:#075211; font-size: 16px;">${item.name || 'Product'}</b><br>
                        <span style="color: #444;">${fmtCurrency(priceAmount)} ${currency}</span>
                    </div>
                </div>

                <button onclick="removeItem(${index})" style="color: #ff4d4d; border: none; background: none; font-weight: bold; cursor: pointer; padding: 10px;">
                    Remove
                </button>
            </div>
        `;
    });

    cartContainer.innerHTML = html;
    totalDisplay.innerText = fmtCurrency(total);
}

/**
 * Removes an item from the cart
 * @param {number} index - The position in the array
 */
window.removeItem = (index) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCart(); // Refresh the list
    
    // Update the floating badge if you have one
    if (window.updateCartCount) window.updateCartCount();
};

/**
 * Redirects back to the checkout/details page
 */
window.goToProduct = (productId) => {
    if (!productId || productId === "undefined") {
        alert("Product details lost. Please find it in the market again.");
        return;
    }
    localStorage.setItem('clickedid', productId);
    window.location.href = 'checkout.html';
};

/**
 * Summarizes the cart and sends it to WhatsApp
 */
window.checkoutAll = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (cart.length === 0) return;
    
    let message = "🚀 *New Order from Ishaka Market*\n";
    message += "--------------------------\n";
    
    cart.forEach((item, index) => {
        const price = (item.price && item.price.amount) ? item.price.amount : 0;
        message += `*${index + 1}.* ${item.name} - ${fmtCurrency(price)} UGX\n`;
    });
    
    const total = totalDisplay.innerText;
    message += "--------------------------\n";
    message += `*TOTAL: ${total} UGX*\n\n`;
    message += "Please confirm availability and delivery.";

    // Encoded WhatsApp URL (Replace with your shop admin number)
    const adminPhone = "2567XXXXXXXX"; 
    window.location.href = `https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`;
};

// Initial Load
document.addEventListener('DOMContentLoaded', loadCart);
