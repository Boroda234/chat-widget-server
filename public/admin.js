document.addEventListener('DOMContentLoaded', () => {
    const conversationsContainer = document.getElementById('conversations-container');
    const notificationSound = document.getElementById('notification-sound');
    const MANAGER_NAME = 'Manager';
    let ws;

    function connect() {
        if (ws && ws.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}`);

        ws.onopen = () => {
            console.log('Connected to WebSocket server as admin.');
            ws.send(JSON.stringify({ type: 'register', payload: { isAdmin: true } }));
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const { type, payload } = data;

            if (type === 'allConversations') {
                renderAllConversations(payload);
            }
            if (type === 'newMessage') {
                handleNewMessage(payload);
                notificationSound.play().catch(e => console.log("Audio play failed:", e));
            }
            if (type === 'typingUpdate') {
                handleTypingIndicator(payload);
            }
            if (type === 'onlineStatusUpdate') {
                updateOnlineStatus(payload);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected. Reconnecting...');
            setTimeout(connect, 3000);
        };
    }

    function renderAllConversations(conversations) {
        conversationsContainer.innerHTML = '';
        if (Object.keys(conversations).length === 0) {
            conversationsContainer.innerHTML = '<p>No conversations yet.</p>';
            return;
        }
        for (const userName in conversations) {
            createConversation(userName, conversations[userName]);
        }
    }

    function handleNewMessage(message) {
        const userName = message.conversation_id;
        let conversationDiv = conversationsContainer.querySelector(`.conversation[data-username="${userName}"]`);
        if (!conversationDiv) {
            // If it's a new conversation, create the whole block
            if (conversationsContainer.querySelector('p')) {
                conversationsContainer.innerHTML = '';
            }
            createConversation(userName, [message]);
        } else {
            // Just append the new message
            const messagesListDiv = conversationDiv.querySelector('.messages-list');
            appendMessage(messagesListDiv, message);
            messagesListDiv.scrollTop = messagesListDiv.scrollHeight;
        }
    }

    function createConversation(userName, messages) {
        const conversationDiv = document.createElement('div');
        conversationDiv.className = 'conversation';
        conversationDiv.dataset.username = userName;

        const header = document.createElement('h2');
        header.className = 'conversation-header';
        header.innerHTML = `Conversation with ${userName} <span class="online-status" data-user="${userName}"></span>`;
        conversationDiv.appendChild(header);

        const messagesListDiv = document.createElement('div');
        messagesListDiv.className = 'messages-list';
        messages.forEach(msg => appendMessage(messagesListDiv, msg));
        conversationDiv.appendChild(messagesListDiv);
        messagesListDiv.scrollTop = messagesListDiv.scrollHeight;

        const replyForm = document.createElement('form');
        replyForm.className = 'reply-form';
        replyForm.dataset.recipient = userName;
        replyForm.innerHTML = `
            <textarea placeholder="Reply to ${userName}..." required rows="2"></textarea>
            <button type="submit">Send Reply</button>
        `;
        conversationDiv.appendChild(replyForm);
        
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator-admin';
        typingIndicator.style.display = 'none';
        typingIndicator.textContent = `${userName} is typing...`;
        conversationDiv.appendChild(typingIndicator);

        conversationsContainer.appendChild(conversationDiv);
    }

    function appendMessage(container, msg) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message';
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = `${msg.sender_name}: `;
        if (msg.sender_name === MANAGER_NAME) {
            senderSpan.classList.add('manager-sender');
        }
        msgDiv.appendChild(senderSpan);
        msgDiv.append(document.createTextNode(msg.message_text));
        container.appendChild(msgDiv);
    }
    
    function handleTypingIndicator({ conversationId, isTyping }) {
        const conversationDiv = conversationsContainer.querySelector(`.conversation[data-username="${conversationId}"]`);
        if (conversationDiv) {
            const indicator = conversationDiv.querySelector('.typing-indicator-admin');
            indicator.style.display = isTyping ? 'block' : 'none';
        }
    }

    function updateOnlineStatus(onlineUsers) {
        document.querySelectorAll('.online-status').forEach(el => {
            if (onlineUsers.includes(el.dataset.user)) {
                el.classList.add('online');
                el.textContent = '(Online)';
            } else {
                el.classList.remove('online');
                el.textContent = '(Offline)';
            }
        });
    }

    conversationsContainer.addEventListener('submit', (e) => {
        if (e.target.classList.contains('reply-form')) {
            e.preventDefault();
            const form = e.target;
            const textarea = form.querySelector('textarea');

            const payload = {
                conversationId: form.dataset.recipient,
                senderName: MANAGER_NAME,
                messageText: textarea.value.trim(),
                recipientName: form.dataset.recipient
            };
            
            if (!payload.messageText || !ws || ws.readyState !== WebSocket.OPEN) return;

            ws.send(JSON.stringify({ type: 'sendMessage', payload }));
            textarea.value = '';
        }
    });
    
    let typingTimeout;
    conversationsContainer.addEventListener('input', (e) => {
        if (e.target.tagName === 'TEXTAREA') {
            const form = e.target.closest('.reply-form');
            const recipient = form.dataset.recipient;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            clearTimeout(typingTimeout);
            ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: recipient, isTyping: true } }));
            
            typingTimeout = setTimeout(() => {
                ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: recipient, isTyping: false } }));
            }, 3000);
        }
    });

    connect();
});