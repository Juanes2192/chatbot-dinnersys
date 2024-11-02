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
  burgers: ["Classic Burger", "Cheese Burger", "Double Burger"],
  drinks: ["Coca-Cola", "Sprite", "Fanta"],
  sides: ["Fries", "Onion Rings", "Chicken Nuggets"]
};

const userStates = {};

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('startConversation', () => {
    userStates[socket.id] = { stage: 'welcome', cart: [] };
    socket.emit('botMessage', '👋 Bienvenido al chatbot de FastFood.\n\nSelecciona una categoría escribiendo el número correspondiente:\n1. 🍔 Burgers\n2. 🥤 Drinks\n3. 🍟 Sides');
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
          socket.emit('botMessage', '⚠️ Opción no válida. Por favor, elige una categoría:\n1. 🍔 Burgers\n2. 🥤 Drinks\n3. 🍟 Sides');
          return;
      }
      userState.stage = 'selectingProduct';
      const products = categories[userState.category];
      const productOptions = products.map((product, index) => `${index + 1}. ${product}`).join('\n');
      socket.emit('botMessage', `Has seleccionado la categoría ${userState.category}.\n\nElige un producto:\n${productOptions}`);
    } else if (userState.stage === 'selectingProduct') {
      // Selección de productos
      const products = categories[userState.category];
      if (selectedOption > 0 && selectedOption <= products.length) {
        const selectedProduct = products[selectedOption - 1];
        userState.cart.push(selectedProduct);
        socket.emit('botMessage', `✅ ${selectedProduct} ha sido agregado a tu carrito.\n\n¿Quieres agregar otro producto? Escribe el número de otra categoría o escribe "finalizar" para completar tu pedido.`);
        userState.stage = 'welcome';
      } else {
        socket.emit('botMessage', `⚠️ Opción no válida. Por favor elige un producto válido:\n${products.map((product, index) => `${index + 1}. ${product}`).join('\n')}`);
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
