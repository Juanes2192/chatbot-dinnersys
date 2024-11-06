import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Cart from './Cart';
import './Chatbot.css';

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Conectado al servidor');
      newSocket.emit('startConversation');
    });

    newSocket.on('botMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Bot', text: message }]);
    });

    newSocket.on('updateCart', (cart) => {
      setCartItems(cart);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Usuario', text: input }]);
      socket.emit('userMessage', input);
      setInput('');
    }
  };

  return (
    <div className="chatbot-container">
      <h2 className="chatbot-title">Chatbot de Pedidos - FastFood</h2>
      
      <div className="chatbox">
        {messages.map((msg, index) => (
          <div key={index} className={`chatbox-message ${msg.sender === 'Bot' ? 'bot' : 'user'}`}>
            <div className={`chatbox-bubble ${msg.sender === 'Bot' ? 'bot' : 'user'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe tu mensaje..."
          className="message-input"
        />
        <button
          onClick={sendMessage}
          className="message-send-button"
        >
          Enviar
        </button>
      </div>
      
      <Cart cartItems={cartItems} />
    </div>
  );
}

export default Chatbot;
