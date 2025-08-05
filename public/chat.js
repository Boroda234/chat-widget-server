(function() {
    // Dynamically determine server URL from the script tag
    const scriptTag = document.currentScript;
    const serverUrl = new URL(scriptTag.src).origin;

    // Create a container for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'dyad-chat-widget-container';
    document.body.appendChild(widgetContainer);

    let unreadCount = 0;

    // Inject CSS for the widget container and button
    const style = document.createElement('style');
    style.innerHTML = `
        #dyad-chat-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column-reverse;
            align-items: flex-end;
            gap: 10px;
        }
        #dyad-chat-button {
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, background-color 0.2s;
            position: relative; /* For the badge */
        }
        #dyad-chat-button:hover {
            transform: scale(1.1);
            background-color: #0056b3;
        }
        #dyad-chat-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background-color: #dc3545;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            font-size: 12px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            display: none; /* Hidden by default */
        }
        #dyad-chat-iframe {
            border: none;
            width: 350px;
            height: 500px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            overflow: hidden;
            opacity: 0;
            transform: translateY(20px) scale(0.95);
            transform-origin: bottom right;
            visibility: hidden;
            transition: opacity 0.3s ease, transform 0.3s ease, visibility 0s 0.3s;
        }
        #dyad-chat-iframe.is-open {
            opacity: 1;
            transform: translateY(0) scale(1);
            visibility: visible;
            transition: opacity 0.3s ease, transform 0.3s ease, visibility 0s 0s;
        }
        @media (max-width: 400px) {
            #dyad-chat-iframe {
                width: calc(100vw - 40px);
                height: calc(100vh - 100px);
            }
        }
    `;
    document.head.appendChild(style);

    // Create the chat button
    const chatButton = document.createElement('button');
    chatButton.id = 'dyad-chat-button';
    chatButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span id="dyad-chat-badge"></span>
    `;
    widgetContainer.appendChild(chatButton);
    const badge = document.getElementById('dyad-chat-badge');

    // Create the iframe for the chat box
    const chatIframe = document.createElement('iframe');
    chatIframe.id = 'dyad-chat-iframe';
    chatIframe.src = `${serverUrl}/chat.html`;
    widgetContainer.appendChild(chatIframe);

    function updateBadge() {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Toggle chat box visibility
    chatButton.addEventListener('click', () => {
        const isOpen = chatIframe.classList.toggle('is-open');
        
        if (isOpen) {
            chatButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span id="dyad-chat-badge"></span>
            `;
            unreadCount = 0;
            updateBadge();
        } else {
            chatButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span id="dyad-chat-badge"></span>
            `;
            updateBadge(); // Re-run to ensure badge is visible if needed
        }
    });

    // Listen for messages from the iframe
    window.addEventListener('message', (event) => {
        if (event.source === chatIframe.contentWindow && event.data.type === 'dyad-chat-unread') {
            if (!chatIframe.classList.contains('is-open')) {
                unreadCount++;
                updateBadge();
            }
        }
    });
})();