// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { categories } = require('./data');
const { addToCart, getCartSummary } = require('./cartUtils');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:8000" }
});

const userStates = {};
const paymentMethods = ['Nequi', 'Bancolombia'];

const botResponses = {
  welcome: '👋 Bienvenido al chatbot de FastFood.\n\nSelecciona una categoría escribiendo el número correspondiente:\n1. 🍔 Hamburguesas\n2. 🥤 Bebidas\n3. 🍟 Pasabocas',
  invalidOption: '⚠️ Opción no válida. Por favor, elige una categoría:\n1. 🍔 Hamburguesas\n2. 🥤 Bebidas\n3. 🍟 Pasabocas',
  selectProduct: (category) => `Has seleccionado la categoría ${category}.\n\nElige un producto:\n${categories[category].map((product, index) => `${index + 1}. ${product}`).join('\n')}\n${categories[category].length + 1}. Volver al menú principal`,
  invalidProduct: (category) => `⚠️ Opción no válida. Por favor elige un producto válido:\n${categories[category].map((product, index) => `${index + 1}. ${product}`).join('\n')}\n${categories[category].length + 1}. Volver al menú principal`,
  selectQuantity: (product) => `¿Cuántos de ${product} quieres?\n(Escribe '0' para volver al menú de productos)`,
  invalidQuantity: '⚠️ Cantidad no válida. Por favor, indica una cantidad válida o escribe "0" para volver.',
  productAdded: (product, quantity) => `✅ ${product} x ${quantity} ha sido agregado a tu carrito.\n\nElige una opción:\n1. Elegir otro plato de esta categoría\n2. Volver al menú de categorías\n3. Finalizar pedido`,
  cartSummary: (cart) => `🛒 Resumen de tu carrito:\n${getCartSummary(cart)}\n\n¿Deseas continuar con el pedido?\n1. Pagar\n2. Volver al menú principal`,
  selectPayment: '¿Cuál es tu método de pago?\n1. Nequi\n2. Bancolombia\n3. Volver al menú principal',
  orderCompleted: (paymentMethod) => `Pedido realizado. ¡Gracias por tu compra! Tu método de pago es ${paymentMethod}.`
};

function validateNumber(input, max) {
  const number = parseInt(input);
  return !isNaN(number) && number >= 0 && number <= max ? number : null;
}

function handleWelcome(socket, msg) {
  const selectedOption = validateNumber(msg, 3);
  const categoryMap = { 1: 'burgers', 2: 'drinks', 3: 'sides' };
  
  if (categoryMap[selectedOption]) {
    userStates[socket.id].category = categoryMap[selectedOption];
    userStates[socket.id].stage = 'selectingProduct';
    socket.emit('botMessage', botResponses.selectProduct(categoryMap[selectedOption]));
  } else {
    socket.emit('botMessage', botResponses.invalidOption);
  }
}

function handleSelectingProduct(socket, msg) {
  const userState = userStates[socket.id];
  const selectedOption = validateNumber(msg, categories[userState.category].length + 1);
  const products = categories[userState.category];
  
  if (selectedOption && selectedOption <= products.length) {
    userState.selectedProduct = products[selectedOption - 1];
    userState.stage = 'selectingQuantity';
    socket.emit('botMessage', botResponses.selectQuantity(userState.selectedProduct));
  } else if (selectedOption === products.length + 1) {
    userState.stage = 'welcome';
    socket.emit('botMessage', botResponses.welcome);
  } else {
    socket.emit('botMessage', botResponses.invalidProduct(userState.category));
  }
}

function handleSelectingQuantity(socket, msg) {
  const userState = userStates[socket.id];
  const quantity = validateNumber(msg, Infinity);
  
  if (quantity === 0) {
    userState.stage = 'selectingProduct';
    socket.emit('botMessage', botResponses.selectProduct(userState.category));
  } else if (quantity) {
    addToCart(userState.cart, userState.selectedProduct, quantity);
    io.to(socket.id).emit('updateCart', userState.cart);
    socket.emit('botMessage', botResponses.productAdded(userState.selectedProduct, quantity));
    userState.stage = 'selectingOptions';
  } else {
    socket.emit('botMessage', botResponses.invalidQuantity);
  }
}

function handleSelectingOptions(socket, msg) {
  const userState = userStates[socket.id];
  const selectedOption = validateNumber(msg, 3);
  
  switch (selectedOption) {
    case 1:
      userState.stage = 'selectingProduct';
      socket.emit('botMessage', botResponses.selectProduct(userState.category));
      break;
    case 2:
      userState.stage = 'welcome';
      socket.emit('botMessage', botResponses.welcome);
      break;
    case 3:
      userState.stage = 'reviewCart';
      socket.emit('botMessage', botResponses.cartSummary(userState.cart));
      break;
    default:
      socket.emit('botMessage', botResponses.productAdded(userState.selectedProduct, 1));
  }
}

function handleReviewCart(socket, msg) {
  const selectedOption = validateNumber(msg, 2);
  if (selectedOption === 1) {
    userStates[socket.id].stage = 'selectingPayment';
    socket.emit('botMessage', botResponses.selectPayment);
  } else if (selectedOption === 2) {
    userStates[socket.id].stage = 'welcome';
    socket.emit('botMessage', botResponses.welcome);
  } else {
    socket.emit('botMessage', botResponses.cartSummary(userStates[socket.id].cart));
  }
}

function handleSelectingPayment(socket, msg) {
  const selectedOption = validateNumber(msg, 3);
  
  if (selectedOption === 1 || selectedOption === 2) {
    socket.emit('botMessage', botResponses.orderCompleted(paymentMethods[selectedOption - 1]));
    userStates[socket.id] = { stage: 'welcome', cart: [] };
  } else if (selectedOption === 3) {
    userStates[socket.id].stage = 'welcome';
    socket.emit('botMessage', botResponses.welcome);
  } else {
    socket.emit('botMessage', botResponses.selectPayment);
  }
}

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);
  userStates[socket.id] = { stage: 'welcome', cart: [] };

  socket.on('startConversation', () => {
    socket.emit('botMessage', botResponses.welcome);
  });

  socket.on('userMessage', (msg) => {
    const userState = userStates[socket.id];
    
    switch (userState.stage) {
      case 'welcome': handleWelcome(socket, msg); break;
      case 'selectingProduct': handleSelectingProduct(socket, msg); break;
      case 'selectingQuantity': handleSelectingQuantity(socket, msg); break;
      case 'selectingOptions': handleSelectingOptions(socket, msg); break;
      case 'reviewCart': handleReviewCart(socket, msg); break;
      case 'selectingPayment': handleSelectingPayment(socket, msg); break;
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
    delete userStates[socket.id];
  });
});

server.listen(3000, () => {
  console.log('Servidor escuchando en http://localhost:3000');
});
