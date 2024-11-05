import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Cart from './Cart';

const socket = io('http://localhost:3000');

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [categorias, setCategorias] = useState([]); // Estado para las categorías

  useEffect(() => {
    // Iniciar la conversación con el bot
    socket.emit('startConversation');
    
    // Cargar las categorías al iniciar el componente
    obtenerCategorias();

    socket.on('botMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Bot', text: message }]);
    });

    socket.on('updateCart', (cart) => {
      setCartItems(cart);
    });

    return () => {
      socket.off('botMessage');
      socket.off('updateCart');
    };
  }, []);

  // Función para obtener categorías desde la API
  async function obtenerCategorias() {
    try {
      const response = await fetch('http://localhost:3000/api/categorias', {
        headers: {
          'Access-Control-Allow-Origin': '*', // Configuración CORS en el lado del cliente
        },
      });
      const categorias = await response.json();
      setCategorias(categorias);
      mostrarCategorias(categorias); // Muestra las categorías como mensaje del bot
    } catch (error) {
      console.error('Error al obtener categorías:', error);
    }
  }

  // Función para mostrar categorías en el chat
  function mostrarCategorias(categorias) {
    const mensajeCategorias = `Estas son las categorías disponibles:\n${categorias
      .map((categoria, index) => `${index + 1}. ${categoria.Nombre}`)
      .join('\n')}\n\nPor favor, escribe el número de la categoría que deseas ver.`;
    setMessages((prevMessages) => [...prevMessages, { sender: 'Bot', text: mensajeCategorias }]);
  }

  // Función para obtener productos de una categoría específica desde la API
  async function obtenerProductos(categoriaId) {
    try {
      const response = await fetch(`http://localhost:3000/api/productos/${categoriaId}`, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
      const productos = await response.json();
      mostrarProductos(productos); // Muestra los productos como mensaje del bot
    } catch (error) {
      console.error('Error al obtener productos:', error);
    }
  }

  // Función para mostrar productos en el chat
  function mostrarProductos(productos) {
    const mensajeProductos = `Estos son los productos disponibles en esta categoría:\n${productos
      .map((producto) => `- ${producto.Nombre}: ${producto.Precio}`)
      .join('\n')}`;
    setMessages((prevMessages) => [...prevMessages, { sender: 'Bot', text: mensajeProductos }]);
  }

  // Manejo del mensaje de usuario para seleccionar una categoría
  const handleUserMessage = (message) => {
    const categoriaSeleccionada = parseInt(message.trim(), 10);
    if (!isNaN(categoriaSeleccionada) && categoriaSeleccionada > 0 && categoriaSeleccionada <= categorias.length) {
      const categoriaId = categorias[categoriaSeleccionada - 1].CategoriaId;
      obtenerProductos(categoriaId);
    } else {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Bot', text: 'Por favor, selecciona una categoría válida escribiendo su número.' }]);
    }
  };

  const sendMessage = () => {
    if (input.trim()) {
      setMessages((prevMessages) => [...prevMessages, { sender: 'Usuario', text: input }]);
      handleUserMessage(input);
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
      <Cart cartItems={cartItems} />
    </div>
  );
}

export default Chatbot;
