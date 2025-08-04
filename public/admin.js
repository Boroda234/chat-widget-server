document.addEventListener('DOMContentLoaded', () => {
    const API_URL = ''; // Relative path
    const conversationsContainer = document.getElementById('conversations-container');
    const MANAGER_NAME = 'Manager';
    const typingTimeouts = {};

    const renderConversations = (messages) => {
        // Group messages by user name
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

        conversationsContainer.innerHTML = ''; // Clear loading message

        if (Object.keys(conversations).length === 0) {
            conversationsContainer.innerHTML = '<p>No conversations yet.</p>';
            return;
        }

        for (const userName in conversations) {
            const userMessages = conversations[userName].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            const conversationDiv = document.createElement('div');
            conversationDiv.className = 'conversation';

            const header = document.createElement('h2');
            header.className = 'conversation-header';
            header.textContent = `Conversation with ${userName}`;
            conversationDiv.appendChild(header);

            const messagesListDiv = document.createElement('div');
            messagesListDiv.className = 'messages-list';
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
            conversationDiv.appendChild(messagesListDiv);
            messagesListDiv.scrollTop = messagesListDiv.scrollHeight;

            // Reply form
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
    };

    const loadConversations = async () => {
        try {
            const response = await fetch(`${API_URL}/messages`);
            if (!response.ok) throw new Error('Failed to fetch messages');
            const messages = await response.json();
            renderConversations(messages);
        } catch (error) {
            console.error('Error loading conversations:', error);
            conversationsContainer.innerHTML = '<p>Could not load conversations.</p>';
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

    // Listen for typing in any reply textarea
    conversationsContainer.addEventListener('input', (e) => {
        if (e.target.tagName === 'TEXTAREA' && e.target.closest('.reply-form')) {
            const form = e.target.closest('.reply-form');
            const recipient = form.dataset.recipient;

            // If no timeout is active for this recipient, send the signal
            if (!typingTimeouts[recipient]) {
                fetch(`${API_URL}/typing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipient }),
                }).catch(err => console.error('Typing signal failed', err));
            }

            // Clear any existing timeout
            clearTimeout(typingTimeouts[recipient]);

            // Set a new timeout. As long as the manager keeps typing, no new request will be sent.
            typingTimeouts[recipient] = setTimeout(() => {
                delete typingTimeouts[recipient];
            }, 5000); // Throttle for 5 seconds
        }
    });

    loadConversations();
    setInterval(loadConversations, 7000);
});