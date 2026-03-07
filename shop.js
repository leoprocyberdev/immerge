import { db } from './db-init.js'; 
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";


async function loadVendorProducts() {
    const urlParams = new URLSearchParams(window.location.search);
    const vendorSlug = urlParams.get('vendor');

    if (!vendorSlug) {
        window.location.href = "index.html";
        return;
    }

    // 1. Fetch the Shop Name from the 'users' collection (The proper way)
    try {
        const userQuery = query(collection(db, "users"), where("businessSlug", "==", vendorSlug));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            document.querySelector('.title').innerText = userData.businessName;
            document.title = `${userData.businessName} | Akatare`;
        }
    } catch (err) { console.error("Name lookup failed:", err); }

    // 2. Query the products
    const q = query(collection(db, "products"), where("businessSlug", "==", vendorSlug));
    const querySnapshot = await getDocs(q);
    const container = document.getElementById('product-list');
    container.innerHTML = ""; 

    if (querySnapshot.empty) {
        container.innerHTML = "<p>This shop has no products yet.</p>";
        return;
    }

    // Helper function for your currency format
    const fmtCurrency = (num) => Number(num).toLocaleString();

    // 3. Render using your exact HTML format
    querySnapshot.forEach((doc) => {
        const product = doc.data();
        // Use either product.image or product.imageUrl depending on your database field name
        const imageSrc = product.image || product.imageUrl || 'images/img.jpg';

        container.innerHTML += `
            <div class="item-card" onclick="window.location.href='checkout.html?id=${doc.id}'" style="cursor:pointer;">
                <center>
                    <img src="${imageSrc}" loading="lazy" onerror="this.src='images/img.jpg'">
                </center>
                <h5>${product.name}</h5>
                <h4>UGX ${fmtCurrency(product.price.amount)} =</h4>
                <center><button>Shop now</button></center>
            </div>
        `;
    });
}



loadVendorProducts();
