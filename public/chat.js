(function() {
    // Dynamically determine server URL from the script tag
    const scriptTag = document.currentScript;
    const serverUrl = new URL(scriptTag.src).origin;

    // Create a container for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'dyad-chat-widget-container';
    document.body.appendChild(widgetContainer);

    // Inject CSS for the widget container and button
    const style = document.createElement('style');
    style.innerHTML = `
        #dyad-chat-widget-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
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
        }
        #dyad-chat-button:hover {
            transform: scale(1.1);
            background-color: #0056b3;
        }
        #dyad-chat-iframe {
            display: none;
            border: none;
            width: 350px;
            height: 500px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            overflow: hidden;
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
    `;
    widgetContainer.appendChild(chatButton);

    // Create the iframe for the chat box
    const chatIframe = document.createElement('iframe');
    chatIframe.id = 'dyad-chat-iframe';
    chatIframe.src = `${serverUrl}/chat.html`;
    widgetContainer.appendChild(chatIframe);

    // Toggle chat box visibility
    chatButton.addEventListener('click', () => {
        const isHidden = chatIframe.style.display === 'none' || chatIframe.style.display === '';
        chatIframe.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            chatButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
        } else {
            chatButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
            `;
        }
    });
})();