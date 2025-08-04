document.addEventListener('DOMContentLoaded', () => {
    const API_URL = ''; // Relative path to the server
    const chatForm = document.getElementById('chat-form');
    const nameInput = document.getElementById('name-input');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('chat-messages');

    // Load name from localStorage
    const savedName = localStorage.getItem('chat_widget_user_name');
    if (savedName) {
        nameInput.value = savedName;
    }

    const renderMessage = (msg) => {
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        
        const currentName = nameInput.value.trim();
        bubble.classList.add(msg.name === currentName ? 'user-message' : 'other-message');

        const sender = document.createElement('div');
        sender.classList.add('sender');
        sender.textContent = msg.name;

        const text = document.createElement('div');
        text.classList.add('text');
        text.textContent = msg.message;

        bubble.appendChild(sender);
        bubble.appendChild(text);
        messagesContainer.appendChild(bubble);
    };

    const scrollToBottom = () => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const loadMessages = async () => {
        const currentName = nameInput.value.trim();
        if (!currentName) {
            messagesContainer.innerHTML = '<p style="text-align: center; font-size: 12px; color: #aaa;">Enter your name to start chatting.</p>';
            return;
        }

        try {
            const response = await fetch(`${API_URL}/messages?user=${encodeURIComponent(currentName)}`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            const messages = await response.json();
            
            messagesContainer.innerHTML = ''; // Clear existing messages
            messages.forEach(msg => renderMessage(msg));
            scrollToBottom();
        } catch (error) {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = '<p>Could not load messages.</p>';
        }
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const message = messageInput.value.trim();

        if (!name || !message) return;

        localStorage.setItem('chat_widget_user_name', name);

        try {
            const response = await fetch(`${API_URL}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, message }),
            });

            if (!response.ok) throw new Error('Failed to send message');
            
            const newMessage = await response.json();
            renderMessage(newMessage);
            messageInput.value = '';
            scrollToBottom();
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Could not send message.');
        }
    });

    nameInput.addEventListener('change', () => {
        localStorage.setItem('chat_widget_user_name', nameInput.value.trim());
        loadMessages();
    });

    // Initial load
    loadMessages();

    // Poll for new messages
    setInterval(loadMessages, 5000);
});