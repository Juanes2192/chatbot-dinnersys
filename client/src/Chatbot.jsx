import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Cart from './Cart'; // Importa el nuevo componente

const socket = io('http://localhost:3000');

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [cartItems, setCartItems] = useState([]); // Estado para el carrito

  useEffect(() => {
    socket.emit('startConversation');

    socket.on('botMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Bot', text: message }]);
    });

    socket.on('updateCart', (cart) => {
      setCartItems(cart); // Actualiza el carrito cuando el servidor lo envíe
    });

    return () => {
      socket.off('botMessage');
      socket.off('updateCart');
    };
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Usuario', text: input }]);
      socket.emit('userMessage', input);
      setInput('');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h2>Chatbot de Pedidos - FastFood</h2>
      <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', maxHeight: '400px', overflowY: 'scroll', backgroundColor: '#f9f9f9' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px', display: 'flex', justifyContent: msg.sender === 'Bot' ? 'flex-start' : 'flex-end' }}>
            <div style={{
              backgroundColor: msg.sender === 'Bot' ? '#e0e0e0' : '#4CAF50',
              color: msg.sender === 'Bot' ? '#333' : '#fff',
              padding: '10px',
              borderRadius: '15px',
              maxWidth: '70%',
              whiteSpace: 'pre-wrap'
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => (e.key === 'Enter' ? sendMessage() : null)}
          placeholder="Escribe tu mensaje..."
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button onClick={sendMessage} style={{ marginLeft: '10px', padding: '10px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#4CAF50', color: '#fff' }}>
          Enviar
        </button>
      </div>
      {/* Agrega el componente Cart aquí */}
      <Cart cartItems={cartItems} />
    </div>
  );
}

export default Chatbot;
