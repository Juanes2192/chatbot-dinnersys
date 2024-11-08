const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8000",
    methods: ["GET", "POST"]
  }
});

// Configurar CORS para las rutas de la API
app.use(cors({
  origin: '*'
}));

// Configuración de la conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'DinnerSys'
});

db.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conectado a la base de datos MySQL');
});

const userStates = {};
const paymentMethods = ['Nequi', 'Bancolombia'];

const botResponses = {
  welcome: '👋 Bienvenido al chatbot de DinnerSys.\n\n\n Selecciona una categoría escribiendo el número correspondiente:',
  invalidOption: '⚠️ Opción no válida. Por favor, elige una categoría válida.',
  selectProduct: (category) => `Has seleccionado la categoría ${category}.\n\nElige un producto:`,
  invalidProduct: '⚠️ Opción no válida. Por favor elige un producto válido.',
  selectQuantity: (product) => `¿Cuántos de ${product} quieres?\n(Escribe '0' para volver al menú de productos)`,
  invalidQuantity: '⚠️ Cantidad no válida. Por favor, indica una cantidad válida o escribe "0" para volver.',
  productAdded: (product, quantity) => `✅ ${product} x ${quantity} ha sido agregado a tu carrito.\n\nElige una opción:\n1. Elegir otro plato de esta categoría\n2. Volver al menú de categorías\n3. Finalizar pedido`,
  cartSummary: (cart) => `🛒 Resumen de tu carrito:\n${getCartSummary(cart)}\n\n¿Deseas continuar con el pedido?\n1. Pagar\n2. Volver al menú principal`,
  selectPayment: '¿Cuál es tu método de pago?\n1. Nequi\n2. Bancolombia\n3. Volver al menú principal',
  orderCompleted: (paymentMethod) => `Pedido realizado. ¡Gracias por tu compra! El método de pago es ${paymentMethod}. Debes realizar el pago al numero 3158770011`,
  requestName: 'Por favor, ingresa tu nombre:',
  requestPhone: '[Nombre del usuario], por favor ingresa tu número de teléfono:',
  requestAddress: 'Por favor, ingresa tu dirección de entrega:'
};

function validateNumber(input, max) {
  const number = parseInt(input);
  return !isNaN(number) && number >= 1 && number <= max ? number : null;
}

function getCategories(callback) {
  console.log('Intentando obtener categorías de la base de datos...');
  
  const query = 'SELECT * FROM Categorias';
  
  try {
    db.query(query, (error, results) => {
      if (error) {
        console.error('Error en getCategories:', error);
        console.error('Estado SQL del error:', error.sqlState);
        console.error('Código de error:', error.code);
        callback(error, null);
        return;
      }
      
      console.log('Categorías obtenidas con éxito. Cantidad:', results.length);
      console.log('Primera categoría:', results[0]);
      
      callback(null, results);
    });
  } catch (err) {
    console.error('Error inesperado en getCategories:', err);
    callback(err, null);
  }
}

// Probar la función
getCategories((error, categories) => {
  if (error) {
    console.error('Error en la llamada de prueba a getCategories:', error);
  } else {
    console.log('Llamada de prueba a getCategories exitosa. Categorías:', categories);
  }
});

console.log('Función getCategories actualizada y probada.');

function getProducts(categoryId, callback) {
  const query = 'SELECT * FROM Productos WHERE Categoria = ? AND Inactivo = 0';
  db.query(query, [categoryId], (error, results) => {
    if (error) {
      console.error('Error al obtener productos:', error);
      callback(error, null);
      return;
    }
    callback(null, results);
  });
}

function addToCart(cart, product, quantity) {
  const existingProduct = cart.find(item => item.ProductoId === product.ProductoId);
  if (existingProduct) {
    existingProduct.Cantidad += quantity;
  } else {
    cart.push({ ...product, Cantidad: quantity });
  }
}

function getCartSummary(cart) {
  return cart.map(item => `${item.Nombre} x ${item.Cantidad} - $${item.Precio * item.Cantidad}`).join('\n');
}

function handleWelcome(socket, msg) {
  getCategories((error, categories) => {
    if (error) {
      socket.emit('botMessage', 'Error al obtener categorías. Por favor, intenta más tarde.');
      return;
    }
    
    const selectedOption = validateNumber(msg, categories.length);
    if (selectedOption) {
      userStates[socket.id].category = categories[selectedOption - 1];
      userStates[socket.id].stage = 'selectingProduct';
      getProducts(userStates[socket.id].category.CategoriaId, (error, products) => {
        if (error) {
          socket.emit('botMessage', 'Error al obtener productos. Por favor, intenta más tarde.');
          return;
        }
        userStates[socket.id].products = products;
        const productList = products.map((product, index) => `${index + 1}. ${product.Nombre} - $${product.Precio}`).join('\n');
        socket.emit('botMessage', `${botResponses.selectProduct(userStates[socket.id].category.NombreCategoria)}\n${productList}\n${products.length + 1}. Volver al menú principal`);
      });
    } else {
      const categoryList = categories.map((category, index) => `${index + 1}. ${category.NombreCategoria}`).join('\n');
      socket.emit('botMessage', `${botResponses.invalidOption}\n${categoryList}`);
    }
  });
}

function handleSelectingProduct(socket, msg) {
  const userState = userStates[socket.id];
  const selectedOption = validateNumber(msg, userState.products.length + 1);
  
  if (selectedOption && selectedOption <= userState.products.length) {
    userState.selectedProduct = userState.products[selectedOption - 1];
    userState.stage = 'selectingQuantity';
    socket.emit('botMessage', botResponses.selectQuantity(userState.selectedProduct.Nombre));
  } else if (selectedOption === userState.products.length + 1) {
    userState.stage = 'welcome';
    getCategories((error, categories) => {
      if (error) {
        socket.emit('botMessage', 'Error al obtener categorías. Por favor, intenta más tarde.');
        return;
      }
      const categoryList = categories.map((category, index) => `${index + 1}. ${category.NombreCategoria}`).join('\n');
      socket.emit('botMessage', `${botResponses.welcome}\n${categoryList}`);
    });
  } else {
    const productList = userState.products.map((product, index) => `${index + 1}. ${product.Nombre} - $${product.Precio}`).join('\n');
    socket.emit('botMessage', `${botResponses.invalidProduct}\n${productList}\n${userState.products.length + 1}. Volver al menú principal`);
  }
}

function handleSelectingQuantity(socket, msg) {
  const userState = userStates[socket.id];
  const quantity = validateNumber(msg, Infinity);
  
  if (quantity === 0) {
    userState.stage = 'selectingProduct';
    const productList = userState.products.map((product, index) => `${index + 1}. ${product.Nombre} - $${product.Precio}`).join('\n');
    socket.emit('botMessage', `${botResponses.selectProduct(userState.category.NombreCategoria)}\n${productList}\n${userState.products.length + 1}. Volver al menú principal`);
  } else if (quantity) {
    addToCart(userState.cart, userState.selectedProduct, quantity);
    socket.emit('updateCart', userState.cart);
    socket.emit('botMessage', botResponses.productAdded(userState.selectedProduct.Nombre, quantity));
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
      const productList = userState.products.map((product, index) => `${index + 1}. ${product.Nombre} - $${product.Precio}`).join('\n');
      socket.emit('botMessage', `${botResponses.selectProduct(userState.category.NombreCategoria)}\n${productList}\n${userState.products.length + 1}. Volver al menú principal`);
      break;
    case 2:
      userState.stage = 'welcome';
      getCategories((error, categories) => {
        if (error) {
          socket.emit('botMessage', 'Error al obtener categorías. Por favor, intenta más tarde.');
          return;
        }
        const categoryList = categories.map((category, index) => `${index + 1}. ${category.NombreCategoria}`).join('\n');
        socket.emit('botMessage', `${botResponses.welcome}\n${categoryList}`);
      });
      break;
    case 3:
      userState.stage = 'reviewCart';
      socket.emit('botMessage', botResponses.cartSummary(userState.cart));
      break;
    default:
      socket.emit('botMessage', botResponses.productAdded(userState.selectedProduct.Nombre, 1));
  }
}

function handleReviewCart(socket, msg) {
  const selectedOption = validateNumber(msg, 2);
  if (selectedOption === 1) {
    userStates[socket.id].stage = 'selectingPayment';
    socket.emit('botMessage', botResponses.selectPayment);
  } else if (selectedOption === 2) {
    userStates[socket.id].stage = 'welcome';
    getCategories((error, categories) => {
      if (error) {
        socket.emit('botMessage', 'Error al obtener categorías. Por favor, intenta más tarde.');
        return;
      }
      const categoryList = categories.map((category, index) => `${index + 1}. ${category.NombreCategoria}`).join('\n');
      socket.emit('botMessage', `${botResponses.welcome}\n${categoryList}`);
    });
  } else {
    socket.emit('botMessage', botResponses.cartSummary(userStates[socket.id].cart));
  }
}

function handleRequestingName(socket, msg) {
  userStates[socket.id].name = msg;
  socket.emit('botMessage', botResponses.requestPhone.replace('[Nombre del usuario]', userStates[socket.id].name));
  userStates[socket.id].stage = 'requestingPhone';
}

function handleRequestingPhone(socket, msg) {
  userStates[socket.id].phone = msg;
  socket.emit('botMessage', botResponses.requestAddress);
  userStates[socket.id].stage = 'requestingAddress';
}

function savePedidoChatbot(socketId, paymentMethod, callback) {
  const userState = userStates[socketId];
  
  console.log('Iniciando savePedidoChatbot para socketId:', socketId);
  console.log('Método de pago:', paymentMethod);
  console.log('Estado del usuario:', JSON.stringify(userState, null, 2));

  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar la transacción:', err);
      callback(err);
      return;
    }

    console.log('Transacción iniciada correctamente');

    const pedidoQuery = 'INSERT INTO PedidosChatbot (ClienteNombre, ClienteContacto, ClienteDireccion, Estado, MetodoPago) VALUES (?, ?, ?, ?, ?)';
    const pedidoValues = [userState.name, userState.phone, userState.address, 'Pendiente', paymentMethod];

    console.log('Query de inserción de pedido:', pedidoQuery);
    console.log('Valores del pedido:', pedidoValues);

    db.query(pedidoQuery, pedidoValues, (error, results) => {
      if (error) {
        console.error('Error al insertar el pedido:', error);
        return db.rollback(() => {
          callback(error);
        });
      }

      console.log('Pedido insertado correctamente. ID:', results.insertId);

      const pedidoId = results.insertId;
      const detalleQuery = 'INSERT INTO DetallePedidoChatbot (PedidoChatbotId, ProductoId, Cantidad) VALUES ?';
      const detalleValues = userState.cart.map(item => [pedidoId, item.ProductoId, item.Cantidad]);

      console.log('Query de inserción de detalles:', detalleQuery);
      console.log('Valores de los detalles:', detalleValues);

      db.query(detalleQuery, [detalleValues], (error) => {
        if (error) {
          console.error('Error al insertar los detalles del pedido:', error);
          return db.rollback(() => {
            callback(error);
          });
        }

        console.log('Detalles del pedido insertados correctamente');

        db.commit((err) => {
          if (err) {
            console.error('Error al hacer commit de la transacción:', err);
            return db.rollback(() => {
              callback(err);
            });
          }
          console.log('Transacción completada con éxito');
          callback(null);
        });
      });
    });
  });
}


function handleRequestingAddress(socket, msg) {
  userStates[socket.id].address = msg;
  console.log('Dirección recibida:', msg);
  console.log('Estado del usuario antes de guardar:', JSON.stringify(userStates[socket.id], null, 2));
  
  savePedidoChatbot(socket.id, userStates[socket.id].paymentMethod, (error) => {
    if (error) {
      console.error('Error al guardar el pedido:', error);
      socket.emit('botMessage', 'Lo siento, ha ocurrido un error al procesar tu pedido. Por favor, intenta nuevamente más tarde.');
    } else {
      console.log('Pedido guardado exitosamente');
      socket.emit('botMessage', botResponses.orderCompleted(userStates[socket.id].paymentMethod));
      userStates[socket.id] = { stage: 'welcome', cart: [] };
    }
  });
}

console.log('Funciones savePedidoChatbot y handleRequestingAddress actualizadas con registros adicionales.');

function handleSelectingPayment(socket, msg) {
  const selectedOption = validateNumber(msg, 3);

  if (selectedOption === 1 || selectedOption === 2) {
    const paymentMethod = paymentMethods[selectedOption - 1];
    userStates[socket.id].paymentMethod = paymentMethod;
    socket.emit('botMessage', botResponses.requestName);
    userStates[socket.id].stage = 'requestingName';
  } else if (selectedOption === 3) {
    userStates[socket.id].stage = 'welcome';
    getCategories((error, categories) => {
      if (error) {
        socket.emit('botMessage', 'Error al obtener categorías. Por favor, intenta más tarde.');
        return;
      }
      const categoryList = categories.map((category, index) => `${index + 1}. ${category.NombreCategoria}`).join('\n');
      socket.emit('botMessage', `${botResponses.welcome}\n${categoryList}`);
    });
  } else {
    socket.emit('botMessage', botResponses.selectPayment);
  }
}

function savePedidoChatbot(socketId, paymentMethod, callback) {
  const userState = userStates[socketId];
  
  console.log('Iniciando savePedidoChatbot para socketId:', socketId);
  console.log('Método de pago:', paymentMethod);
  console.log('Estado del usuario:', JSON.stringify(userState, null, 2));

  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar la transacción:', err);
      callback(err);
      return;
    }

    console.log('Transacción iniciada correctamente');

    const pedidoQuery = 'INSERT INTO PedidosChatbot (ClienteNombre, ClienteContacto, Direccion, Estado, MetodoPago) VALUES (?, ?, ?, ?, ?)';
    const pedidoValues = [userState.name, userState.phone, userState.address, 'Pendiente', paymentMethod];

    console.log('Query de inserción de pedido:', pedidoQuery);
    console.log('Valores del pedido:', pedidoValues);

    db.query(pedidoQuery, pedidoValues, (error, results) => {
      if (error) {
        console.error('Error al insertar el pedido:', error);
        return db.rollback(() => {
          callback(error);
        });
      }

      console.log('Pedido insertado correctamente. ID:', results.insertId);

      const pedidoId = results.insertId;
      const detalleQuery = 'INSERT INTO DetallePedidoChatbot (PedidoChatbotId, ProductoId, Cantidad) VALUES ?';
      const detalleValues = userState.cart.map(item => [pedidoId, item.ProductoId, item.Cantidad]);

      console.log('Query de inserción de detalles:', detalleQuery);
      console.log('Valores de los detalles:', detalleValues);

      db.query(detalleQuery, [detalleValues], (error) => {
        if (error) {
          console.error('Error al insertar los detalles del pedido:', error);
          return db.rollback(() => {
            callback(error);
          });
        }

        console.log('Detalles del pedido insertados correctamente');

        db.commit((err) => {
          if (err) {
            console.error('Error al hacer commit de la transacción:', err);
            return db.rollback(() => {
              callback(err);
            });
          }
          console.log('Transacción completada con éxito');
          callback(null);
        });
      });
    });
  });
}

io.on('connection', (socket) => {
  console.log('Cliente conectado');

  userStates[socket.id] = { stage: 'welcome', cart: [] };

  socket.on('startConversation', () => {
    getCategories((error, categories) => {
      if (error) {
        socket.emit('botMessage', 'Error al obtener categorías. Por favor, intenta más tarde.');
        return;
      }
      const categoryList = categories.map((category, index) => `${index + 1}. ${category.NombreCategoria}`).join('\n');
      socket.emit('botMessage', `${botResponses.welcome}\n${categoryList}`);
    });
  });

  socket.on('userMessage', (message) => {
    const userState = userStates[socket.id];
    switch (userState.stage) {
      case 'welcome':
        handleWelcome(socket, message);
        break;
      case 'selectingProduct':
        handleSelectingProduct(socket, message);
        break;
      case 'selectingQuantity':
        handleSelectingQuantity(socket, message);
        break;
      case 'selectingOptions':
        handleSelectingOptions(socket, message);
        break;
      case 'reviewCart':
        handleReviewCart(socket, message);
        break;
      case 'selectingPayment':
        handleSelectingPayment(socket, message);
        break;
      case 'requestingName':
        handleRequestingName(socket, message);
        break;
      case 'requestingPhone':
        handleRequestingPhone(socket, message);
        break;
      case 'requestingAddress':
        handleRequestingAddress(socket, message);
        break;
      default:
        socket.emit('botMessage', 'Lo siento, no entiendo ese comando. Por favor, sigue las instrucciones proporcionadas.');
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
    delete userStates[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

console.log("Servidor iniciado correctamente.");