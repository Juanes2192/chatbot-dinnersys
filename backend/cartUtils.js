// cartUtils.js
function addToCart(cart, product, quantity) {
    const existingProduct = cart.find(item => item.product === product);
    if (existingProduct) {
      existingProduct.quantity += quantity;
    } else {
      cart.push({ product, quantity });
    }
  }
  
  function getCartSummary(cart) {
    return cart.map(item => `${item.product} x ${item.quantity}`).join('\n');
  }
  
  module.exports = { addToCart, getCartSummary };
  