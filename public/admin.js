document.addEventListener('DOMContentLoaded', () => {
    const conversationsContainer = document.getElementById('conversations-container');
    const notificationSound = document.getElementById('notification-sound');
    const MANAGER_NAME = 'Manager';
    let ws;

    function connect() {
        if (ws && ws.readyState === WebSocket.OPEN) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        ws = new WebSocket(`${protocol}//${host}/admin`);

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
                if (payload.sender_name !== MANAGER_NAME) {
                    notificationSound.play().catch(e => console.log("Audio play failed:", e));
                }
            }
            if (type === 'typingUpdate') {
                handleTypingIndicator(payload);
            }
            if (type === 'onlineStatusUpdate') {
                updateOnlineStatus(payload);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected. You may need to log in again.');
            conversationsContainer.innerHTML = '<p>Connection lost. Attempting to reconnect or <a href="/login.html">log in again</a>.</p>';
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 5000);
        };
    }

    function renderAllConversations(conversations) {
        conversationsContainer.innerHTML = '';
        if (Object.keys(conversations).length === 0) {
            conversationsContainer.innerHTML = '<p>No conversations yet.</p>';
            return;
        }
        // Sort conversations by the timestamp of the last message
        const sortedKeys = Object.keys(conversations).sort((a, b) => {
            const lastMsgA = conversations[a][conversations[a].length - 1];
            const lastMsgB = conversations[b][conversations[b].length - 1];
            if (!lastMsgA) return 1;
            if (!lastMsgB) return -1;
            return new Date(lastMsgB.timestamp) - new Date(lastMsgA.timestamp);
        });

        for (const userName of sortedKeys) {
            createConversation(userName, conversations[userName]);
        }
    }

    function handleNewMessage(message) {
        const userName = message.conversation_id;
        let conversationDiv = conversationsContainer.querySelector(`.conversation[data-username="${userName}"]`);
        
        // Stop showing typing indicator
        const indicator = conversationDiv ? conversationDiv.querySelector('.typing-indicator-admin') : null;
        if (indicator) {
            indicator.style.display = 'none';
        }

        if (!conversationDiv) {
            if (conversationsContainer.querySelector('p')) {
                conversationsContainer.innerHTML = '';
            }
            createConversation(userName, [message]);
            // Since it's new, move it to the top
            const newConv = conversationsContainer.querySelector(`.conversation[data-username="${userName}"]`);
            conversationsContainer.prepend(newConv);
        } else {
            const messagesListDiv = conversationDiv.querySelector('.messages-list');
            appendMessage(messagesListDiv, message);
            messagesListDiv.scrollTop = messagesListDiv.scrollHeight;
            // Move updated conversation to the top
            conversationsContainer.prepend(conversationDiv);
        }
    }

    function createConversation(userName, messages) {
        const conversationDiv = document.createElement('div');
        conversationDiv.className = 'conversation';
        conversationDiv.dataset.username = userName;

        const header = document.createElement('div');
        header.className = 'conversation-header';
        header.innerHTML = `
            <span>${userName}</span>
            <span class="online-status" data-user="${userName}"></span>
            <span class="online-status-text" data-user-text="${userName}">(Offline)</span>
        `;
        conversationDiv.appendChild(header);

        const messagesListDiv = document.createElement('div');
        messagesListDiv.className = 'messages-list';
        messages.forEach(msg => appendMessage(messagesListDiv, msg));
        conversationDiv.appendChild(messagesListDiv);
        messagesListDiv.scrollTop = messagesListDiv.scrollHeight;

        const replyFormContainer = document.createElement('div');
        replyFormContainer.className = 'reply-form-container';
        
        const replyForm = document.createElement('form');
        replyForm.className = 'reply-form';
        replyForm.dataset.recipient = userName;
        replyForm.innerHTML = `
            <textarea placeholder="Reply to ${userName}..." required rows="1"></textarea>
            <button type="submit">Send</button>
        `;
        replyFormContainer.appendChild(replyForm);
        
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator-admin';
        typingIndicator.style.display = 'none';
        typingIndicator.textContent = `${userName} is typing...`;
        replyFormContainer.appendChild(typingIndicator);

        conversationDiv.appendChild(replyFormContainer);
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
    
    function handleTypingIndicator({ conversationId, isTyping, senderName }) {
        // Don't show typing indicator for admin's own typing
        if (senderName === MANAGER_NAME) {
            return;
        }

        const conversationDiv = conversationsContainer.querySelector(`.conversation[data-username="${conversationId}"]`);
        if (conversationDiv) {
            const indicator = conversationDiv.querySelector('.typing-indicator-admin');
            indicator.style.display = isTyping ? 'block' : 'none';
        }
    }

    function updateOnlineStatus(onlineUsers) {
        document.querySelectorAll('.online-status').forEach(el => {
            const user = el.dataset.user;
            const textEl = document.querySelector(`.online-status-text[data-user-text="${user}"]`);
            if (onlineUsers.includes(user)) {
                el.classList.add('online');
                if(textEl) textEl.textContent = '(Online)';
            } else {
                el.classList.remove('online');
                if(textEl) textEl.textContent = '(Offline)';
            }
        });
    }

    conversationsContainer.addEventListener('submit', (e) => {
        if (e.target.classList.contains('reply-form')) {
            e.preventDefault();
            const form = e.target;
            const textarea = form.querySelector('textarea');
            const recipient = form.dataset.recipient;

            const payload = {
                conversationId: recipient,
                senderName: MANAGER_NAME,
                messageText: textarea.value.trim(),
                recipientName: recipient
            };
            
            if (!payload.messageText || !ws || ws.readyState !== WebSocket.OPEN) return;

            ws.send(JSON.stringify({ type: 'sendMessage', payload }));
            textarea.value = '';
            
            // Stop typing indicator after sending
            clearTimeout(typingTimeouts[recipient]);
            ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: recipient, senderName: MANAGER_NAME, isTyping: false } }));
        }
    });
    
    const typingTimeouts = {};
    conversationsContainer.addEventListener('input', (e) => {
        if (e.target.tagName === 'TEXTAREA') {
            const form = e.target.closest('.reply-form');
            const recipient = form.dataset.recipient;
            if (!ws || ws.readyState !== WebSocket.OPEN) return;

            clearTimeout(typingTimeouts[recipient]);
            ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: recipient, senderName: MANAGER_NAME, isTyping: true } }));
            
            typingTimeouts[recipient] = setTimeout(() => {
                ws.send(JSON.stringify({ type: 'typing', payload: { conversationId: recipient, senderName: MANAGER_NAME, isTyping: false } }));
            }, 3000);
        }
    });

    connect();
});