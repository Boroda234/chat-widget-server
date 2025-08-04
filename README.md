# Simple Self-Hosted Chat Widget

This project provides a simple, self-hosted chat widget that can be easily integrated into any website. It includes a Node.js/Express backend and a vanilla JavaScript frontend.

## Features

-   Floating chat button that opens a chat box.
-   Clean, modern, dark-themed UI.
-   Messages are sent to a backend server and stored in a local `messages.json` file.
-   User's name is saved in `localStorage` for convenience.
-   Easy to embed with a single `<script>` tag.
-   CORS enabled to allow embedding on different domains.
-   Basic input validation on the backend.

## Project Structure

```
.
├── public/
│   ├── chat.html       # The HTML for the chat iframe
│   ├── chat.css        # Styles for the chat iframe
│   ├── client.js       # Client-side logic for the chat
│   ├── chat.js         # The embeddable script
│   └── test-page.html  # A page to test the widget
├── messages.json       # Stores chat messages
├── server.js           # The Express backend server
├── package.json
└── README.md
```

## How to Run

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or later)
-   npm (usually comes with Node.js)

### 2. Installation

Install the dependencies:

```bash
npm install
```

### 3. Running the Server

To start the server, run:

```bash
npm start
```

This will start the server on `http://localhost:3000` by default.

For development, you can use `nodemon` for automatic restarts on file changes:

```bash
npm run dev
```

## How to Embed in Your Website

1.  Make sure the chat widget server is running and accessible from the internet.
2.  Add the following script tag to your HTML file, just before the closing `</body>` tag.
3.  Replace `https://your-chat-server.com` with the actual URL where you are hosting this chat widget server.

```html
<script src="https://your-chat-server.com/chat.js"></script>
```

For local testing, you can open `http://localhost:3000` in your browser, which serves a test page with the widget already embedded.

## Deployment

To deploy this application, you can use any service that supports Node.js applications, such as Heroku, Vercel, Render, or a traditional VPS.

1.  **Upload your code** to the hosting provider.
2.  **Install dependencies**: The provider should automatically run `npm install`.
3.  **Set the start command**: Ensure the provider uses `npm start` (or `node server.js`) to run the application.
4.  **Environment Variables**: The server runs on port 3000 by default, but most hosting providers will set a `PORT` environment variable, which the application will automatically use.
5.  **Update the embed script**: Once deployed, update the `src` attribute in your `<script>` tag on your other websites to point to your new live server URL.