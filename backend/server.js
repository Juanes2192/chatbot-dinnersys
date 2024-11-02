// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:8000" } // Cambia el puerto según el de tu cliente
});

// Definimos las categorías y productos
const categories = {
  burgers: ["Hamburguesa Clasica", "Hamburguesa de queso", "Hamburguesa Doble"],
  drinks: ["Coca-Cola", "Sprite", "Fanta"],
  sides: ["Papas a la francesa", "Aros de Cebolla", "Nuggets de pollo"]
};

const userStates = {};

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('startConversation', () => {
    userStates[socket.id] = { stage: 'welcome', cart: [] };
    socket.emit('botMessage', '👋 Bienvenido al chatbot de FastFood.\n\nSelecciona una categoría escribiendo el número correspondiente:\n1. 🍔 Hamburguesas\n2. 🥤 Bebidas\n3. 🍟 Pasabocas');
  });

  socket.on('userMessage', (msg) => {
    const userState = userStates[socket.id];
    const selectedOption = parseInt(msg);

    if (userState.stage === 'welcome') {
      // Selección de categorías
      switch (selectedOption) {
        case 1:
          userState.category = 'burgers';
          break;
        case 2:
          userState.category = 'drinks';
          break;
        case 3:
          userState.category = 'sides';
          break;
        default:
          socket.emit('botMessage', '⚠️ Opción no válida. Por favor, elige una categoría:\n1. 🍔 Hamburguesas\n2. 🥤 Bebidas\n3. 🍟 Pasabocas');
          return;
      }
      userState.stage = 'selectingProduct';
      userState.cart = []; // Reinicia el carrito
      const products = categories[userState.category];
      const productOptions = products.map((product, index) => `${index + 1}. ${product}`).join('\n');
      socket.emit('botMessage', `Has seleccionado la categoría ${userState.category}.\n\nElige un producto:\n${productOptions}`);
    } else if (userState.stage === 'selectingProduct') {
      // Selección de productos
      const products = categories[userState.category];
      if (selectedOption > 0 && selectedOption <= products.length) {
        userState.selectedProduct = products[selectedOption - 1];
        userState.stage = 'selectingQuantity';
        socket.emit('botMessage', `¿Cuántos de ${userState.selectedProduct} quieres?`);
      } else {
        socket.emit('botMessage', `⚠️ Opción no válida. Por favor elige un producto válido:\n${products.map((product, index) => `${index + 1}. ${product}`).join('\n')}`);
      }
    } else if (userState.stage === 'selectingQuantity') {
      // Selección de cantidad
      const quantity = parseInt(msg);
      if (!isNaN(quantity) && quantity > 0) {
        userState.cart.push(`${userState.selectedProduct} x ${quantity}`);
        // Envía la actualización del carrito al cliente
        io.to(socket.id).emit('updateCart', userState.cart);
        socket.emit('botMessage', `✅ ${userState.selectedProduct} x ${quantity} ha sido agregado a tu carrito.\n\nElige una opción:\n1. Elegir otro plato de esta categoría\n2. Volver al menú de categorías\n3. Finalizar pedido`);
        userState.stage = 'selectingOptions';
      } else {
        socket.emit('botMessage', '⚠️ Cantidad no válida. Por favor, indica una cantidad válida.');
      }
    } else if (userState.stage === 'selectingOptions') {
      // Opciones después de la selección
      switch (selectedOption) {
        case 1:
          const products = categories[userState.category];
          const productOptions = products.map((product, index) => `${index + 1}. ${product}`).join('\n');
          socket.emit('botMessage', `Elige otro producto:\n${productOptions}`);
          userState.stage = 'selectingProduct';
          break;
        case 2:
          userState.stage = 'welcome';
          socket.emit('botMessage', 'Selecciona una categoría escribiendo el número correspondiente:\n1. 🍔 Hamburguesas\n2. 🥤 Bebidas\n3. 🍟 Pasabocas');
          break;
        case 3:
          userState.stage = 'selectingPayment';
          socket.emit('botMessage', '¿Cuál es tu método de pago?\n1. Nequi\n2. Bancolombia');
          break;
        default:
          socket.emit('botMessage', '⚠️ Opción no válida. Por favor, elige:\n1. Elegir otro plato de esta categoría\n2. Volver al menú de categorías\n3. Finalizar pedido');
      }
    } else if (userState.stage === 'selectingPayment') {
      // Selección de método de pago
      switch (selectedOption) {
        case 1:
        case 2:
          socket.emit('botMessage', `Pedido realizado. ¡Gracias por tu compra! Tu método de pago es ${selectedOption === 1 ? 'Nequi' : 'Bancolombia'}.`);
          userStates[socket.id] = { stage: 'welcome', cart: [] }; // Reinicia el estado del usuario
          break;
        default:
          socket.emit('botMessage', '⚠️ Opción no válida. Por favor, elige un método de pago:\n1. Nequi\n2. Bancolombia');
      }
    }
  });

  socket.on('disconnect', () => {
    delete userStates[socket.id];
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
