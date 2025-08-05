const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let db;

async function initializeDatabase() {
    if (db) return db;

    db = await open({
        filename: './chat.db',
        driver: sqlite3.Database
    });

    // Create messages table if it doesn't exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            sender_name TEXT NOT NULL,
            recipient_name TEXT,
            message_text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Database initialized successfully.');
    return db;
}

async function addMessage(conversationId, senderName, messageText, recipientName = null) {
    const db = await initializeDatabase();
    const result = await db.run(
        'INSERT INTO messages (conversation_id, sender_name, message_text, recipient_name) VALUES (?, ?, ?, ?)',
        [conversationId, senderName, messageText, recipientName]
    );
    
    const newMessage = await db.get('SELECT * FROM messages WHERE id = ?', result.lastID);
    return newMessage;
}

async function getMessagesForConversation(conversationId) {
    const db = await initializeDatabase();
    return db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC', conversationId);
}

async function getAllConversations() {
    const db = await initializeDatabase();
    const messages = await db.all('SELECT * FROM messages ORDER BY timestamp ASC');
    
    // Group messages by conversation_id
    const conversations = messages.reduce((acc, msg) => {
        const key = msg.conversation_id;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(msg);
        return acc;
    }, {});

    return conversations;
}

module.exports = {
    initializeDatabase,
    addMessage,
    getMessagesForConversation,
    getAllConversations
};