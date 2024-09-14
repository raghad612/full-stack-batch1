document.addEventListener("DOMContentLoaded", loadCart);

// Listen for the storage event to detect changes to localStorage
window.addEventListener("storage", function (event) {
  if (event.key === "productsArr") {
    loadCart();
  }
});

function loadCart() {
  const cartElement = document.getElementById("cart");
  if (!cartElement) {
    console.error("Cart element not found.");
    return;
  }

  const productsArr = JSON.parse(localStorage.getItem("productsArr")) || [];
  console.log("Loading cart:", productsArr);

  if (productsArr.length === 0) {
    cartElement.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }
  
  fetch("data/products.json")
    .then((response) => response.json())
    .then((data) => {
      const products = data.games; // Assuming your JSON structure has a `games` array
      let cartHTML = "";
      let subtotal = 0;
      let discount = 0;
      const delivery = 5.99; // Example delivery charge
      let finalTotal = 0;

      // Use a Map to keep track of unique products based on ID and platform
      const uniqueCartItems = new Map();

      productsArr.forEach((cartItem) => {
        const product = products.find((item) => item.id == cartItem.nb);
        if (!product) {
          console.error(`Product with id ${cartItem.nb} not found.`);
          return;
        }

        const key = `${cartItem.nb}-${cartItem.type}`;
        if (!uniqueCartItems.has(key)) {
          uniqueCartItems.set(key, {
            product,
            occurrence: cartItem.occurrence,
            platformType: cartItem.type,
          });
        } else {
          uniqueCartItems.get(key).occurrence += cartItem.occurrence;
        }
      });

      uniqueCartItems.forEach((item) => {
        const platform = item.product.platforms.find(
          (p) => p.type === item.platformType
        );
        if (!platform) {
          console.error(
            `Platform ${item.platformType} not found for product id ${item.product.id}.`
          );
          return;
        }

        const price = platform.price;
        const discountedPrice = item.discountedPrice || price; // Assuming discount logic is implemented

        subtotal += price * item.occurrence;
        discount += (price - discountedPrice) * item.occurrence;

        cartHTML += `
          <div class="cart-item">
            <img src="${platform.image}" alt="${item.product.name}">
            <div class="item-details">
              <h3>${item.product.name} (${platform.type})</h3>
              <p>Price: $${price.toFixed(2)}</p>
              ${
                discountedPrice < price
                  ? `<p>Discounted Price: $${discountedPrice.toFixed(2)}</p>`
                  : ""
              }
              <div class="quantity-controls">
                <button class="decrement" data-id="${
                  item.product.id
                }" data-platform="${platform.type}">-</button>
                <input type="number" value="${
                  item.occurrence
                }" min="1" data-id="${item.product.id}" data-platform="${
          platform.type
        }" class="quantity-input">
                <button class="increment" data-id="${
                  item.product.id
                }" data-platform="${platform.type}">+</button>
              </div>
              <p>Total: $${(discountedPrice * item.occurrence).toFixed(2)}</p>
              <button class="remove-item" data-id="${
                item.product.id
              }" data-platform="${platform.type}">Remove</button>
            </div>
          </div>
        `;
      });

      finalTotal = subtotal - discount + delivery;

      cartElement.innerHTML = `
        <div class="cart-items">
          ${cartHTML}
        </div>
        <div class="cart-summary">
          <p>Subtotal: $${subtotal.toFixed(2)}</p>
          <p>Discount: -$${discount.toFixed(2)}</p>
          <p>Delivery: $${delivery.toFixed(2)}</p>
          <p><strong>Total: $${finalTotal.toFixed(2)}</strong></p>
          <button id="clear-cart">Clear Cart</button>
          <button id="checkout">Checkout</button>
        </div>
      `;

      attachEventListeners();
      updateCheckoutData();
    })
    .catch((error) => {
      console.error("Error loading cart data:", error);
    });
}

function attachEventListeners() {
  document.querySelectorAll(".quantity-input").forEach((input) => {
    input.addEventListener("change", updateQuantity);
  });

  document
    .querySelectorAll(".quantity-controls .increment")
    .forEach((button) => {
      button.addEventListener("click", incrementQuantity);
    });

  document
    .querySelectorAll(".quantity-controls .decrement")
    .forEach((button) => {
      button.addEventListener("click", decrementQuantity);
    });

  document.querySelectorAll(".remove-item").forEach((button) => {
    button.addEventListener("click", removeItem);
  });

  document.getElementById("clear-cart").addEventListener("click", clearCart);
  document.getElementById("checkout").addEventListener("click", checkout);
}
function updateCheckoutData() {
  const productsArr = JSON.parse(localStorage.getItem("productsArr")) || [];

  fetch("data/products.json")
    .then((response) => response.json())
    .then((data) => {
      const products = data.games;
      const checkoutItems = [];
      let subtotal = 0;
      let discount = 0;
      const delivery = 5.99;
      let totalQuantity = 0;

      productsArr.forEach((cartItem) => {
        const product = products.find((item) => item.id == cartItem.nb);
        if (!product) return;

        const platform = product.platforms.find(
          (p) => p.type === cartItem.type
        );
        if (!platform) return;

        const price = platform.price;
        const discountedPrice = cartItem.discountedPrice || price;
        const totalItemPrice = discountedPrice * cartItem.occurrence;

        subtotal += price * cartItem.occurrence;
        discount += (price - discountedPrice) * cartItem.occurrence;
        totalQuantity += cartItem.occurrence;

        checkoutItems.push({
          id: product.id,
          name: product.name,
          platform: platform.type,
          quantity: cartItem.occurrence,
          price: discountedPrice,
          totalItemPrice: totalItemPrice,
          image: platform.image,
        });
      });

      const finalTotal = subtotal - discount + delivery;

      localStorage.setItem("checkoutItems", JSON.stringify(checkoutItems));
      localStorage.setItem("finalTotal", finalTotal.toFixed(2));
      localStorage.setItem("totalQuantity", totalQuantity.toString());
    });
}

function incrementQuantity(event) {
  const productID = event.target.getAttribute("data-id");
  const platformType = event.target.getAttribute("data-platform");
  let cartItems = JSON.parse(localStorage.getItem("productsArr"));

  const itemIndex = cartItems.findIndex(
    (item) => item.nb == productID && item.type == platformType
  );

  if (itemIndex !== -1) {
    cartItems[itemIndex].occurrence++;
    localStorage.setItem("productsArr", JSON.stringify(cartItems));
    loadCart();
  }
  updateCheckoutData();
}

function decrementQuantity(event) {
  const productID = event.target.getAttribute("data-id");
  const platformType = event.target.getAttribute("data-platform");
  let cartItems = JSON.parse(localStorage.getItem("productsArr"));

  const itemIndex = cartItems.findIndex(
    (item) => item.nb == productID && item.type == platformType
  );

  if (itemIndex !== -1 && cartItems[itemIndex].occurrence > 1) {
    cartItems[itemIndex].occurrence--;
    localStorage.setItem("productsArr", JSON.stringify(cartItems));
    loadCart();
  }
  updateCheckoutData();
}

function updateQuantity(event) {
  const productID = event.target.getAttribute("data-id");
  const platformType = event.target.getAttribute("data-platform");
  let cartItems = JSON.parse(localStorage.getItem("productsArr"));

  const itemIndex = cartItems.findIndex(
    (item) => item.nb == productID && item.type == platformType
  );

  if (itemIndex !== -1) {
    const newQuantity = parseInt(event.target.value, 10);
    if (newQuantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      cartItems[itemIndex].occurrence = newQuantity;
    }
    localStorage.setItem("productsArr", JSON.stringify(cartItems));
    loadCart();
  }
  updateCheckoutData();
}

function removeItem(event) {
  const productID = event.target.getAttribute("data-id");
  const platformType = event.target.getAttribute("data-platform");

  let cartItems = JSON.parse(localStorage.getItem("productsArr")) || [];

  cartItems = cartItems.filter(
    (item) => !(item.nb == productID && item.type == platformType)
  );

  localStorage.setItem("productsArr", JSON.stringify(cartItems));
  loadCart();
  updateCheckoutData();
}

function clearCart() {
  localStorage.setItem("productsArr", JSON.stringify([]));
  loadCart();
  updateCheckoutData();
}

// from here function to send data to checkout page
let checkoutTab = null;

function checkout() {
  const productsArr = JSON.parse(localStorage.getItem("productsArr")) || [];

  if (productsArr.length === 0) {
    alert("Your cart is empty. Add items to your cart before checking out.");
    return;
  }

  fetch("data/products.json")
    .then((response) => response.json())
    .then((data) => {
      const products = data.games;
      const checkoutItems = [];
      let subtotal = 0;
      let discount = 0;
      const delivery = 5.99;
      let totalQuantity = 0;

      productsArr.forEach((cartItem) => {
        const product = products.find((item) => item.id == cartItem.nb);
        if (!product) {
          console.error(`Product with id ${cartItem.nb} not found.`);
          return;
        }

        const platform = product.platforms.find(
          (p) => p.type === cartItem.type
        );
        if (!platform) {
          console.error(
            `Platform ${cartItem.type} not found for product id ${product.id}.`
          );
          return;
        }

        const price = platform.price;
        const discountedPrice = cartItem.discountedPrice || price;
        const totalItemPrice = discountedPrice * cartItem.occurrence;

        subtotal += price * cartItem.occurrence;
        discount += (price - discountedPrice) * cartItem.occurrence;
        totalQuantity += cartItem.occurrence;

        checkoutItems.push({
          id: product.id,
          name: product.name,
          platform: platform.type,
          quantity: cartItem.occurrence,
          price: discountedPrice,
          totalItemPrice: totalItemPrice,
          image: platform.image,
        });
      });

      const finalTotal = subtotal - discount + delivery;

      localStorage.setItem("checkoutItems", JSON.stringify(checkoutItems));
      localStorage.setItem("finalTotal", finalTotal.toFixed(2));
      localStorage.setItem("totalQuantity", totalQuantity.toString());

      // Open or focus on the checkout tab to open
      if (checkoutTab === null || checkoutTab.closed) {
        checkoutTab = window.open("checkout.html", "_blank");
        setTimeout(() => {
          checkoutTab.postMessage({ type: "updateCheckout" }, "*");
        }, 500);
      } else {
        checkoutTab.focus();
        checkoutTab.postMessage({ type: "updateCheckout" }, "*");
      }
    })
    .catch((error) => {
      console.error("Error loading cart data:", error);
    });
}
