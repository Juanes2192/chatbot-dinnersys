import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000'); // Asegúrate de que esta URL sea la correcta

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    socket.emit('startConversation');

    socket.on('botMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Bot', text: message }]);
    });

    return () => {
      socket.off('botMessage');
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
              whiteSpace: 'pre-wrap' // Para mostrar saltos de línea en los mensajes
            }}>
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={{ width: '80%', padding: '10px', fontSize: '16px' }}
          placeholder="Escribe el número de la opción..."
        />
        <button onClick={sendMessage} style={{ padding: '10px', fontSize: '16px', marginLeft: '5px' }}>
          Enviar
        </button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3>Carrito de Compras</h3>
        {messages.find(msg => msg.sender === 'Bot' && msg.text.includes("agregado a tu carrito")) ? (
          <ul>
            {messages
              .filter(msg => msg.text.includes("ha sido agregado a tu carrito"))
              .map((msg, index) => (
                <li key={index}>{msg.text.replace("✅ ", "").replace(" ha sido agregado a tu carrito.", "")}</li>
              ))}
          </ul>
        ) : (
          <p>Tu carrito está vacío.</p>
        )}
      </div>
    </div>
  );
}

export default Chatbot;
