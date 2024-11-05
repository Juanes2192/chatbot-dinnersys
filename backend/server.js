const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3000;

// Crear el servidor HTTP
const server = http.createServer(app);

// Configurar `socket.io` con CORS
const io = new Server(server, {
    cors: {
        origin: "http://localhost:8000", // Cambia esto según la URL del cliente en producción
        methods: ["GET", "POST"]
    }
});

// Configurar CORS para las rutas de la API
app.use(cors({
    origin: '*' // Cambia '*' por el dominio del cliente en producción para mayor seguridad
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

// Endpoint para obtener todas las categorías
app.get('/api/categorias', (req, res) => {
    const query = 'SELECT * FROM Categorias';

    db.query(query, (error, results) => {
        if (error) {
            console.error('Error al obtener categorías:', error);
            res.status(500).json({ error: 'Error al obtener categorías' });
            return;
        }
        res.json(results);
    });
});

// Endpoint para obtener productos de una categoría específica
app.get('/api/productos/:categoriaId', (req, res) => {
    const { categoriaId } = req.params;
    const query = 'SELECT * FROM Productos WHERE Categoria = ? AND Inactivo = 0';

    db.query(query, [categoriaId], (error, results) => {
        if (error) {
            console.error('Error al obtener productos:', error);
            res.status(500).json({ error: 'Error al obtener productos' });
            return;
        }
        res.json(results);
    });
});

// Manejar la conexión de socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado');

    // Limpiar mensajes antiguos al iniciar la conversación
    socket.on('startConversation', () => {
        socket.emit('botMessage', '¡Hola! ¿En qué puedo ayudarte?');

        // Obtener las categorías y enviarlas al cliente
        const query = 'SELECT NombreCategoria FROM Categorias';
        db.query(query, (error, results) => {
            if (error) {
                console.error('Error al obtener categorías:', error);
                socket.emit('botMessage', 'Error al obtener categorías');
                return;
            }
            const categorias = results.map((categoria, index) => `${index + 1}. ${categoria.NombreCategoria}`).join('\n');
            socket.emit('botMessage', `Categorías disponibles:\n${categorias}`);
        });
    });

    // Evento de desconexión
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});

// Iniciar el servidor en el puerto especificado
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
