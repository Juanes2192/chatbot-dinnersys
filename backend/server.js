// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173" } // Cambia el puerto según el que uses para el cliente Vite
});

io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('userMessage', (msg) => {
    console.log('Mensaje recibido del usuario:', msg);

    let botResponse;
    if (msg.toLowerCase().includes('hola')) {
      botResponse = '¡Hola! ¿En qué puedo ayudarte?';
    } else if (msg.toLowerCase().includes('adiós')) {
      botResponse = '¡Hasta luego!';
    } else {
      botResponse = 'Lo siento, no entiendo. ¿Puedes preguntar de otra forma?';
    }

    socket.emit('botMessage', botResponse);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

const PORT = 3000; // Elige el puerto que desees para el backend
server.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
