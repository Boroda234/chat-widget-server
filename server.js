const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Serve a test page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-page.html'));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// In-memory stores
const clients = new Map(); // { ws: { conversationId, isAdmin } }
const onlineUsers = new Set(); // { 'John Doe', 'Jane Smith' }

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
    broadcastToAdmins({
        type: 'onlineStatusUpdate',
        payload: Array.from(onlineUsers)
    });
}

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.error('Invalid JSON received:', message);
            return;
        }

        const { type, payload } = data;

        if (type === 'register') {
            const { conversationId, isAdmin } = payload;
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

// Initialize database and start server
db.initializeDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`Chat widget server running on http://localhost:${PORT}`);
        console.log(`Admin panel available at http://localhost:${PORT}/admin.html`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});