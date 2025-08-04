const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

// In-memory store for typing status { recipientName: timestamp }
const typingStatus = {};
const TYPING_TIMEOUT_MS = 8 * 1000; // 8 seconds

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // To parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files

// Helper function to read messages
const readMessages = (callback) => {
    fs.readFile(MESSAGES_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File doesn't exist, start with an empty array
                return callback(null, []);
            }
            return callback(err);
        }
        try {
            const messages = JSON.parse(data);
            callback(null, messages);
        } catch (parseErr) {
            callback(parseErr);
        }
    });
};

// Helper function to write messages
const writeMessages = (messages, callback) => {
    fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8', callback);
};

// API routes
app.get('/messages', (req, res) => {
    const { user } = req.query;

    readMessages((err, messages) => {
        if (err) {
            console.error('Error reading messages:', err);
            return res.status(500).json({ error: 'Failed to read messages.' });
        }

        if (user) {
            // Filter messages for a specific user's conversation
            const userMessages = messages.filter(msg => 
                msg.name === user || msg.recipient === user
            );
            res.json(userMessages);
        } else {
            // For admin panel, return all messages
            res.json(messages);
        }
    });
});

app.post('/message', (req, res) => {
    const { name, message, recipient } = req.body;

    // Basic validation
    if (!name || !message || typeof name !== 'string' || typeof message !== 'string' || name.trim() === '' || message.trim() === '') {
        return res.status(400).json({ error: 'Invalid input: name and message are required.' });
    }

    const newMessage = {
        name: name.trim(),
        message: message.trim(),
        timestamp: new Date().toISOString()
    };

    // Add recipient if provided (for manager replies)
    if (recipient && typeof recipient === 'string' && recipient.trim() !== '') {
        newMessage.recipient = recipient.trim();
    }

    readMessages((err, messages) => {
        if (err) {
            console.error('Error reading messages for writing:', err);
            return res.status(500).json({ error: 'Failed to process message.' });
        }

        messages.push(newMessage);

        writeMessages(messages, (writeErr) => {
            if (writeErr) {
                console.error('Error writing message:', writeErr);
                return res.status(500).json({ error: 'Failed to save message.' });
            }
            res.status(201).json(newMessage);
        });
    });
});

// New endpoint for typing signals
app.post('/typing', (req, res) => {
    const { recipient } = req.body;
    if (recipient && typeof recipient === 'string') {
        typingStatus[recipient] = Date.now();
        res.status(200).send();
    } else {
        res.status(400).json({ error: 'Invalid recipient.' });
    }
});

// New endpoint for clients to check status
app.get('/status', (req, res) => {
    const { user } = req.query;
    if (!user) {
        return res.status(400).json({ error: 'User parameter is required.' });
    }

    const typingTimestamp = typingStatus[user];
    const isTyping = typingTimestamp && (Date.now() - typingTimestamp < TYPING_TIMEOUT_MS);

    if (isTyping) {
        res.json({ isTyping: true });
    } else {
        if (typingStatus[user]) {
            delete typingStatus[user];
        }
        res.json({ isTyping: false });
    }
});


// Serve a test page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'test-page.html'));
});


app.listen(PORT, () => {
    console.log(`Chat widget server running on http://localhost:${PORT}`);
    console.log(`Admin panel available at http://localhost:${PORT}/admin.html`);
    console.log(`Embed the chat widget using: <script src="http://localhost:${PORT}/chat.js"></script>`);
});