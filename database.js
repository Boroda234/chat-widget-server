const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, 'messages.json');
let dbCache = null;

// Вспомогательная функция для чтения файла базы данных
async function readDb() {
    if (dbCache) return dbCache;
    try {
        await fs.access(dbPath);
        const data = await fs.readFile(dbPath, 'utf-8');
        // Если файл пуст, вернем пустой объект
        dbCache = data ? JSON.parse(data) : {};
        return dbCache;
    } catch (error) {
        // Если файл не существует, инициализируем его
        dbCache = {};
        await fs.writeFile(dbPath, JSON.stringify(dbCache, null, 2));
        return dbCache;
    }
}

// Вспомогательная функция для записи в файл базы данных
async function writeDb(data) {
    dbCache = data;
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

async function initializeDatabase() {
    await readDb();
    console.log('Database (JSON file) initialized successfully.');
}

async function addMessage(conversationId, senderName, messageText, recipientName = null) {
    const db = await readDb();
    
    if (!db[conversationId]) {
        db[conversationId] = [];
    }

    const newMessage = {
        id: Date.now() + Math.random().toString(36).substr(2, 9), // Простой уникальный ID
        conversation_id: conversationId,
        sender_name: senderName,
        recipient_name: recipientName,
        message_text: messageText,
        timestamp: new Date().toISOString()
    };

    db[conversationId].push(newMessage);
    await writeDb(db);
    
    return newMessage;
}

async function getMessagesForConversation(conversationId) {
    const db = await readDb();
    return db[conversationId] || [];
}

async function getAllConversations() {
    return await readDb();
}

module.exports = {
    initializeDatabase,
    addMessage,
    getMessagesForConversation,
    getAllConversations
};