// src/Chatbot.jsx
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000'); // Asegúrate de que esta URL sea la correcta

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
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
      <h2>Chatbot en tiempo real</h2>
      <div style={{ border: '1px solid #ccc', padding: '10px', maxHeight: '400px', overflowY: 'scroll' }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '10px' }}>
            <strong>{msg.sender}:</strong> {msg.text}
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
          placeholder="Escribe tu mensaje..."
        />
        <button onClick={sendMessage} style={{ padding: '10px', fontSize: '16px', marginLeft: '5px' }}>
          Enviar
        </button>
      </div>
    </div>
  );
}

export default Chatbot;
