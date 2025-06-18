# WebSocket Client Webpage

This directory contains a simple HTML, CSS, and JavaScript based WebSocket client.
It allows you to connect to a WebSocket server, send JSON messages, and view received messages.

## Features

-   Connect to a specified WebSocket server URL.
-   Disconnect from the server.
-   Display connection status (Idle, Connecting, Connected, Disconnected, Error).
-   Text area to compose JSON messages.
-   Button to send the composed message.
-   Text area to display messages received from the server (attempts to pretty-print JSON).
-   Button to clear the received messages log.

## How to Use

1.  **Ensure a WebSocket server is running.**
    *   The client defaults to connecting to `ws://localhost:5151`. You can change this URL in the input field on the page.
    *   The backend service this page is intended to communicate with (as suggested by the project's `src/index.ts`) is expected to be at this address.

2.  **Open `index.html` in your web browser.**
    *   Navigate to the `public` directory of this project.
    *   Open the `index.html` file directly in a modern web browser (e.g., Chrome, Firefox, Edge, Safari). No special build step is required for this simple client.

3.  **Connect to the WebSocket Server:**
    *   Verify or enter the WebSocket server URL in the input field.
    *   Click the "Connect" button.
    *   The status should update to "Connected" if successful.

4.  **Send and Receive Messages:**
    *   Once connected, type your JSON message into the "Send Message (JSON)" text area.
    *   Click the "Send" button.
    *   Messages sent and received will appear in the "Received Messages" text area.

5.  **Disconnect:**
    *   Click the "Disconnect" button to close the WebSocket connection.

## Files

-   `index.html`: The main HTML structure of the webpage.
-   `style.css`: CSS styles for the webpage.
-   `app.js`: JavaScript logic for WebSocket communication and UI interactions.
