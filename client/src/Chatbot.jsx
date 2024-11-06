import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import Cart from './Cart';
import './Chatbot.css'

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
    <div className="p-6 max-w-lg mx-auto font-sans bg-white shadow-lg rounded-lg border border-gray-300">
      <h2 className="text-2xl font-semibold mb-5 text-center text-gray-800">Chatbot de Pedidos - FastFood</h2>
      
      <div className="chatbox border rounded-lg p-5 h-96 overflow-y-auto bg-gray-100">
        {messages.map((msg, index) => (
          <div key={index} className={`my-2 flex ${msg.sender === 'Bot' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`p-3 rounded-xl max-w-[70%] whitespace-pre-wrap shadow-md ${
                msg.sender === 'Bot' ? 'bg-gray-300 text-gray-900' : 'bg-blue-600 text-white'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4 flex items-center border-t pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Escribe tu mensaje..."
          className="flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-700"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          Enviar
        </button>
      </div>
      
      <Cart cartItems={cartItems} />
    </div>
  );
}

export default Chatbot;
