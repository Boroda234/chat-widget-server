document.addEventListener('DOMContentLoaded', () => {
    const API_URL = ''; // Relative path
    const conversationsContainer = document.getElementById('conversations-container');
    const MANAGER_NAME = 'Manager';
    const typingTimeouts = {};

    const renderOrUpdateConversations = (messages) => {
        const conversations = messages.reduce((acc, msg) => {
            const key = msg.name === MANAGER_NAME ? msg.recipient : msg.name;
            if (key) {
                if (!acc[key]) {
                    acc[key] = [];
                }
                acc[key].push(msg);
            }
            return acc;
        }, {});

        if (Object.keys(conversations).length === 0 && conversationsContainer.children.length < 2) {
            conversationsContainer.innerHTML = '<p>No conversations yet.</p>';
            return;
        } else if (Object.keys(conversations).length > 0 && conversationsContainer.querySelector('p')) {
            conversationsContainer.innerHTML = '';
        }

        for (const userName in conversations) {
            const userMessages = conversations[userName].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            let conversationDiv = conversationsContainer.querySelector(`.conversation[data-username="${userName}"]`);

            if (!conversationDiv) {
                // Conversation doesn't exist, create it
                conversationDiv = document.createElement('div');
                conversationDiv.className = 'conversation';
                conversationDiv.dataset.username = userName;

                const header = document.createElement('h2');
                header.className = 'conversation-header';
                header.textContent = `Conversation with ${userName}`;
                conversationDiv.appendChild(header);

                const messagesListDiv = document.createElement('div');
                messagesListDiv.className = 'messages-list';
                conversationDiv.appendChild(messagesListDiv);

                const replyForm = document.createElement('form');
                replyForm.className = 'reply-form';
                replyForm.dataset.recipient = userName;

                const textarea = document.createElement('textarea');
                textarea.placeholder = `Reply to ${userName}...`;
                textarea.required = true;
                textarea.rows = 2;

                const button = document.createElement('button');
                button.type = 'submit';
                button.textContent = 'Send Reply';

                replyForm.appendChild(textarea);
                replyForm.appendChild(button);
                conversationDiv.appendChild(replyForm);

                conversationsContainer.appendChild(conversationDiv);
            }

            // Update the messages list for this conversation
            const messagesListDiv = conversationDiv.querySelector('.messages-list');
            const shouldScroll = messagesListDiv.scrollTop + messagesListDiv.clientHeight >= messagesListDiv.scrollHeight - 20;

            if (messagesListDiv.children.length !== userMessages.length) {
                messagesListDiv.innerHTML = ''; // Clear only the messages
                userMessages.forEach(msg => {
                    const msgDiv = document.createElement('div');
                    msgDiv.className = 'message';
                    const senderSpan = document.createElement('span');
                    senderSpan.className = 'sender';
                    senderSpan.textContent = `${msg.name}: `;

                    if (msg.name === MANAGER_NAME) {
                        senderSpan.classList.add('manager-sender');
                    }

                    msgDiv.appendChild(senderSpan);
                    msgDiv.append(document.createTextNode(msg.message));
                    messagesListDiv.appendChild(msgDiv);
                });
                
                if (shouldScroll) {
                    messagesListDiv.scrollTop = messagesListDiv.scrollHeight;
                }
            }
        }
    };

    const loadConversations = async () => {
        try {
            const response = await fetch(`${API_URL}/messages`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            const messages = await response.json();
            renderOrUpdateConversations(messages);
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    };

    conversationsContainer.addEventListener('submit', async (e) => {
        if (e.target.classList.contains('reply-form')) {
            e.preventDefault();
            const form = e.target;
            const textarea = form.querySelector('textarea');
            const recipient = form.dataset.recipient;
            const message = textarea.value.trim();

            if (!message || !recipient) return;

            try {
                const response = await fetch(`${API_URL}/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: MANAGER_NAME,
                        message: message,
                        recipient: recipient
                    }),
                });

                if (!response.ok) throw new Error('Failed to send reply');
                
                textarea.value = '';
                loadConversations();

            } catch (error) {
                console.error('Error sending reply:', error);
                alert('Could not send reply.');
            }
        }
    });

    conversationsContainer.addEventListener('input', (e) => {
        if (e.target.tagName === 'TEXTAREA' && e.target.closest('.reply-form')) {
            const form = e.target.closest('.reply-form');
            const recipient = form.dataset.recipient;

            if (!typingTimeouts[recipient]) {
                fetch(`${API_URL}/typing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipient }),
                }).catch(err => console.error('Typing signal failed', err));
            }

            clearTimeout(typingTimeouts[recipient]);

            typingTimeouts[recipient] = setTimeout(() => {
                delete typingTimeouts[recipient];
            }, 5000);
        }
    });

    loadConversations();
    setInterval(loadConversations, 7000);
});