document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const nameInput = document.getElementById('name-input');
    const messageInput = document.getElementById('message-input');
    const messagesContainer = document.getElementById('chat-messages');
    const notificationSound = document.getElementById('notification-sound');

    let ws;
    let typingTimeout;
    let currentName = localStorage.getItem('chat_widget_user_name') || '';
    nameInput.value = currentName;

    function connect() {
        if (ws && ws.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}`);

        ws.onopen = () => {
            console.log('Connected to WebSocket server.');
            if (currentName) {
                ws.send(JSON.stringify({ type: 'register', payload: { conversationId: currentName } }));
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            if (type === 'history') {
                messagesContainer.innerHTML = '';
                payload.forEach(renderMessage);
                scrollToBottom();
            }

            if (type === 'newMessage') {
                renderMessage(payload);
                scrollToBottom();
                if (payload.sender_name !== currentName) {
                    notificationSound.play().catch(e => console.log("Audio play failed:", e));
                    if (document.hidden) {
                        window.parent.postMessage({ type: 'dyad-chat-unread' }, '*');
                    }
                }
            }

            if (type === 'typingUpdate') {
                handleTypingIndicator(payload);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected. Reconnecting...');
            setTimeout(connect, 3000);
        };
    }

    function renderMessage(msg) {
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        bubble.classList.add(msg.sender_name === currentName ? 'user-message' : 'other-message');

        const sender = document.createElement('div');
        sender.classList.add('sender');
        sender.textContent = msg.sender_name;

        const text = document.createElement('div');
        text.classList.add('text');
        text.textContent = msg.message_text;

        bubble.appendChild(sender);
        bubble.appendChild(text);
        messagesContainer.appendChild(bubble);
    }

    function handleTypingIndicator({ conversationId, isTyping }) {
        const existingIndicator = messagesContainer.querySelector('.typing-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        if (isTyping && conversationId === currentName) {
            const indicator = document.createElement('div');
            indicator.classList.add('message-bubble', 'other-message', 'typing-indicator');
            indicator.innerHTML = `
                <div class="sender">Manager</div>
                <div class="text">
                    <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
                </div>
            `;
            messagesContainer.appendChild(indicator);
            scrollToBottom();
        }
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (!message || !currentName || !ws || ws.readyState !== WebSocket.OPEN) return;

        const payload = {
            conversationId: currentName,
            senderName: currentName,
            messageText: message
        };
        ws.send(JSON.stringify({ type: 'sendMessage', payload }));
        messageInput.value = '';
    });

    nameInput.addEventListener('change', () => {
        const newName = nameInput.value.trim();
        if (newName && newName !== currentName) {
            currentName = newName;
            localStorage.setItem('chat_widget_user_name', currentName);
            messagesContainer.innerHTML = '';
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'register', payload: { conversationId: currentName } }));
            } else {
                connect();
            }
        }
    });

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.requestSubmit();
        }
    });

    messageInput.addEventListener('input', () => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        
        clearTimeout(typingTimeout);
        ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: currentName, isTyping: true } }));
        
        typingTimeout = setTimeout(() => {
            ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: currentName, isTyping: false } }));
        }, 3000);
    });

    if (currentName) {
        connect();
    } else {
        messagesContainer.innerHTML = '<p style="text-align: center; font-size: 12px; color: #aaa;">Enter your name to start chatting.</p>';
    }
});