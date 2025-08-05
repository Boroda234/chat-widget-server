require('dotenv').config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const db = require('./database');

// --- НАЧАЛО ИЗМЕНЕНИЙ ---
// Проверка наличия обязательных переменных окружения
if (!process.env.SESSION_SECRET || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.error('FATAL ERROR: Missing required environment variables. Please check your .env file.');
    console.error('Required variables are: SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD');
    process.exit(1); // Завершаем процесс с ошибкой
}
// --- КОНЕЦ ИЗМЕНЕНИЙ ---

const app = express();
const PORT = process.env.PORT || 3000;

// Session middleware setup
const sessionParser = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true })); // for parsing form data
app.use(sessionParser);

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-page.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.user = { username: username };
        res.redirect('/admin.html');
    } else {
        res.redirect('/login.html?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login.html');
    });
});

// Auth middleware for protected routes
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login.html');
}

// Protect admin page
app.get('/admin.html', requireAuth, (req, res) => {
    // This is needed to override the static middleware for the protected route
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// In-memory stores
const clients = new Map();
const onlineUsers = new Set();

// WebSocket broadcast functions
function broadcastToConversation(conversationId, message) {
    for (const [client, meta] of clients.entries()) {
        if (client.readyState === client.OPEN && (meta.conversationId === conversationId || meta.isAdmin)) {
            client.send(JSON.stringify(message));
        }
    }
}

function broadcastToAdmins(message) {
    for (const [client, meta] of clients.entries()) {
        if (client.readyState === client.OPEN && meta.isAdmin) {
            client.send(JSON.stringify(message));
        }
    }
}

function updateOnlineStatus() {
    broadcastToAdmins({ type: 'onlineStatusUpdate', payload: Array.from(onlineUsers) });
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) { return; }

        const { type, payload } = data;
        const isAdmin = req.session && req.session.user;

        if (type === 'register') {
            const { conversationId } = payload;
            clients.set(ws, { conversationId, isAdmin });

            if (isAdmin) {
                const allConversations = await db.getAllConversations();
                ws.send(JSON.stringify({ type: 'allConversations', payload: allConversations }));
                ws.send(JSON.stringify({ type: 'onlineStatusUpdate', payload: Array.from(onlineUsers) }));
            } else {
                const history = await db.getMessagesForConversation(conversationId);
                ws.send(JSON.stringify({ type: 'history', payload: history }));
                if (!onlineUsers.has(conversationId)) {
                    onlineUsers.add(conversationId);
                    updateOnlineStatus();
                }
            }
        }

        if (type === 'sendMessage') {
            const { conversationId, senderName, messageText, recipientName } = payload;
            const newMessage = await db.addMessage(conversationId, senderName, messageText, recipientName);
            broadcastToConversation(conversationId, { type: 'newMessage', payload: newMessage });
        }

        if (type === 'typing') {
            const { conversationId, isTyping } = payload;
            broadcastToConversation(conversationId, { type: 'typingUpdate', payload: { conversationId, isTyping } });
        }
    });

    ws.on('close', () => {
        const meta = clients.get(ws);
        if (meta && !meta.isAdmin) {
            onlineUsers.delete(meta.conversationId);
            updateOnlineStatus();
        }
        clients.delete(ws);
        console.log('Client disconnected');
    });
});

// Handle server upgrade to WebSocket, checking for auth
server.on('upgrade', (request, socket, head) => {
    sessionParser(request, {}, () => {
        // For admin connections, check session
        if (request.url.startsWith('/admin')) {
            if (!request.session || !request.session.user) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    });
});

// Initialize database and start server
db.initializeDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`Chat widget server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});